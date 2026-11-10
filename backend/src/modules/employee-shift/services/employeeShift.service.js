const mongoose = require("mongoose");
const Employee = require("../../employees/models/Employee");
const EmployeeBranchAssignment = require("../../employees/models/EmployeeBranchAssignment");
const Branch = require("../../branches/models/Branch");
const DailyAttendance = require("../../attendance/models/DailyAttendance");
const AuditHelper = require("../../audit-logs/services/AuditHelper");
const ApiError = require("../../../utils/errors/ApiError");

class EmployeeShiftService {
  // ─── Helpers ─────────────────────────────────────────────────────────────

  _isSuperAdmin(authContext = {}) {
    return Boolean(authContext.isSuperAdmin);
  }

  _assertCanManageShifts(authContext = {}) {
    if (this._isSuperAdmin(authContext)) return;
    const roleNorm = (authContext.role || "").toUpperCase();
    if (["ADMIN", "SUPER_ADMIN", "HR_ADMIN", "INTERNAL_ADMIN"].includes(roleNorm)) {
      return;
    }
    throw ApiError.forbidden("Access denied: Only Admins can create, approve, cancel, or end employee branch shifts.");
  }


  // Branch/employee ids are stored as either strings or ObjectIds across the app, so match both.
  _idIn(val) {
    const s = String(val?._id || val);
    return mongoose.Types.ObjectId.isValid(s) ? { $in: [s, new mongoose.Types.ObjectId(s)] } : s;
  }

  _shiftPopulate(query) {
    return query
      .populate("employeeId", "name employeeCode email mobile")
      .populate("branchId", "name code")
      .populate("sourceBranchId", "name code")
      .populate("approvedBy", "name email")
      .populate("createdBy", "name email");
  }

  /**
   * Schedule and approve a temporary employee branch shift.
   * Only authorized Admins / Super Admins can create shifts.
   */
  async createBranchShift(employeeId, dto, actorId, authContext = {}) {
    this._assertCanManageShifts(authContext);

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      throw ApiError.badRequest("Invalid employee ID format.");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw ApiError.notFound("Employee not found.");
    }
    if (employee.employmentStatus !== "ACTIVE" || !employee.isActive) {
      throw ApiError.badRequest("Cannot shift inactive or departed employee.");
    }

    const sourceBranchId = employee.branchId ? (employee.branchId._id || employee.branchId) : null;
    if (!sourceBranchId) {
      throw ApiError.badRequest("Employee has no assigned home branch.");
    }

    const destinationBranchId = dto.destinationBranchId || dto.branchId;
    if (!destinationBranchId || !mongoose.Types.ObjectId.isValid(destinationBranchId)) {
      throw ApiError.badRequest("Valid destination branchId is required.");
    }

    const destBranch = await Branch.findById(destinationBranchId);
    if (!destBranch) {
      throw ApiError.notFound("Destination branch not found.");
    }

    if (sourceBranchId.toString() === destinationBranchId.toString()) {
      throw ApiError.badRequest("Destination branch cannot be the same as the employee's home branch.");
    }

    if (!dto.fromDate || !dto.toDate) {
      throw ApiError.badRequest("Both fromDate and toDate (YYYY-MM-DD) are required for a temporary shift.");
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const fromStr = String(dto.fromDate).trim().slice(0, 10);
    const toStr = String(dto.toDate).trim().slice(0, 10);
    if (!dateRegex.test(fromStr) || !dateRegex.test(toStr)) {
      throw ApiError.badRequest("Dates must be in YYYY-MM-DD format.");
    }

    if (fromStr > toStr) {
      throw ApiError.badRequest("Shift start date (fromDate) cannot be later than end date (toDate).");
    }

    const startDate = new Date(`${fromStr}T00:00:00.000Z`);
    const endDate = new Date(`${toStr}T23:59:59.999Z`);

    // Check for overlapping temporary shifts for the same employee
    const overlappingShift = await EmployeeBranchAssignment.findOne({
      employeeId: employee._id,
      assignmentType: "TEMPORARY",
      status: { $ne: "CANCELLED" },
      fromDate: { $lte: endDate },
      toDate: { $gte: startDate },
    });

    if (overlappingShift) {
      throw ApiError.conflict(
        `Employee already has an active or scheduled temporary shift overlapping ${fromStr} to ${toStr}.`
      );
    }

    // Attendance already recorded in the period would stay at the home branch and clash with the shift
    const existingAttendance = await DailyAttendance.findOne({
      employeeId: this._idIn(employee._id),
      attendanceDate: { $gte: fromStr, $lte: toStr },
    });

    if (existingAttendance) {
      throw ApiError.badRequest(
        existingAttendance.isLocked
          ? `Cannot create shift: Attendance for ${existingAttendance.attendanceDate} is already locked and finalized.`
          : `Cannot create shift: Attendance is already recorded for ${existingAttendance.attendanceDate}. A shift can only cover dates without attendance.`
      );
    }

    // Determine initial lifecycle state based on current date
    const todayStr = new Date().toISOString().slice(0, 10);
    let initialStatus = "ACTIVE";
    if (fromStr > todayStr) {
      initialStatus = "SCHEDULED";
    } else if (toStr < todayStr) {
      initialStatus = "COMPLETED";
    }

    const shift = await EmployeeBranchAssignment.create({
      employeeId: employee._id,
      branchId: destinationBranchId,
      sourceBranchId,
      roleId: dto.roleId || employee.roleId || null,
      fromDate: startDate,
      toDate: endDate,
      isPrimary: false,
      assignmentType: "TEMPORARY",
      status: initialStatus,
      remarks: (dto.remarks || "").trim(),
      approvedBy: actorId || null,
      approvedAt: new Date(),
      createdBy: actorId || new mongoose.Types.ObjectId(),
    });

    await AuditHelper.log({
      action: "EMPLOYEE_BRANCH_SHIFT_CREATE",
      actorId: actorId || authContext.userId,
      entityType: "EMPLOYEE_BRANCH_ASSIGNMENT",
      entityId: shift._id,
      branchId: destinationBranchId,
      after: shift.toObject(),
    });

    return this._shiftPopulate(EmployeeBranchAssignment.findById(shift._id)).lean();
  }

  /**
   * List temporary branch shifts with optional filtering by employee, branch, status, or date.
   */
  async getBranchShifts(filters = {}, pagination = {}, authContext = {}) {
    const q = { assignmentType: "TEMPORARY" };

    if (filters.employeeId) {
      q.employeeId = this._idIn(filters.employeeId);
    }

    if (filters.branchId) {
      const bIn = this._idIn(filters.branchId);
      q.$or = [{ branchId: bIn }, { sourceBranchId: bIn }];
    }

    // Stored status can lag behind the dates, so filter on the date range instead.
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);
    const statusFilter = filters.status ? String(filters.status).toUpperCase() : "";
    if (statusFilter === "CANCELLED") {
      q.status = "CANCELLED";
    } else if (statusFilter === "SCHEDULED") {
      q.status = { $ne: "CANCELLED" };
      q.fromDate = { $gt: todayEnd };
    } else if (statusFilter === "ACTIVE") {
      q.status = { $ne: "CANCELLED" };
      q.fromDate = { $lte: todayEnd };
      q.toDate = { $gte: todayStart };
    } else if (statusFilter === "COMPLETED") {
      q.status = { $ne: "CANCELLED" };
      q.toDate = { $lt: todayStart };
    }

    if (filters.date) {
      const targetDate = new Date(`${filters.date}T12:00:00.000Z`);
      q.fromDate = { ...(q.fromDate || {}), $lte: targetDate };
      q.toDate = { ...(q.toDate || {}), $gte: targetDate };
    }

    // Search by employee name or code (employeeId is a reference, so resolve ids first)
    if (filters.search && typeof filters.search === "string" && filters.search.trim()) {
      const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = await Employee.find({
        $or: [{ name: new RegExp(escaped, "i") }, { employeeCode: new RegExp(escaped, "i") }],
      })
        .select("_id")
        .limit(500)
        .lean();
      const ids = matches.map((e) => e._id);
      if (filters.employeeId) {
        q.employeeId = ids.some((i) => String(i) === String(filters.employeeId))
          ? this._idIn(filters.employeeId)
          : { $in: [] };
      } else {
        q.employeeId = { $in: ids.flatMap((i) => [String(i), i]) };
      }
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this._shiftPopulate(EmployeeBranchAssignment.find(q))
        .sort({ fromDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmployeeBranchAssignment.countDocuments(q),
    ]);

    // Compute effective lifecycle status on the fly based on current calendar date
    const enriched = items.map((shift) => {
      let currentStatus = shift.status;
      if (currentStatus !== "CANCELLED") {
        const fromStr = shift.fromDate ? new Date(shift.fromDate).toISOString().slice(0, 10) : "";
        const toStr = shift.toDate ? new Date(shift.toDate).toISOString().slice(0, 10) : "";
        if (toStr && toStr < todayStr) {
          currentStatus = "COMPLETED";
        } else if (fromStr && fromStr <= todayStr && (!toStr || toStr >= todayStr)) {
          currentStatus = "ACTIVE";
        } else if (fromStr && fromStr > todayStr) {
          currentStatus = "SCHEDULED";
        }
      }
      return { ...shift, effectiveStatus: currentStatus };
    });

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Cancel a scheduled temporary branch shift.
   * Completed shifts or shifts with existing destination attendance cannot be cancelled.
   */
  async cancelBranchShift(shiftId, cancellationReason = "", actorId, authContext = {}) {
    this._assertCanManageShifts(authContext);

    if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
      throw ApiError.badRequest("Invalid shift ID format.");
    }

    const shift = await EmployeeBranchAssignment.findById(shiftId);
    if (!shift || shift.assignmentType !== "TEMPORARY") {
      throw ApiError.notFound("Temporary branch shift not found.");
    }

    if (shift.status === "CANCELLED") {
      throw ApiError.badRequest("Shift is already cancelled.");
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const toStr = shift.toDate ? new Date(shift.toDate).toISOString().slice(0, 10) : "";
    if (toStr && toStr < todayStr) {
      throw ApiError.badRequest("Completed shifts cannot be cancelled.");
    }

    // Safety guard: prevent cancellation if attendance records already exist at destination branch
    const fromStr = shift.fromDate ? new Date(shift.fromDate).toISOString().slice(0, 10) : "";
    const existingAtt = await DailyAttendance.findOne({
      employeeId: this._idIn(shift.employeeId),
      branchId: this._idIn(shift.branchId),
      attendanceDate: { $gte: fromStr, $lte: toStr },
    });

    if (existingAtt) {
      throw ApiError.badRequest(
        `Cannot cancel shift: Destination branch attendance records already exist on ${existingAtt.attendanceDate}. End the shift early instead.`
      );
    }

    const beforeState = shift.toObject();
    shift.status = "CANCELLED";
    shift.cancelledBy = actorId || authContext.userId;
    shift.cancelledAt = new Date();
    shift.cancellationReason = (cancellationReason || "").trim();
    await shift.save();

    await AuditHelper.log({
      action: "EMPLOYEE_BRANCH_SHIFT_CANCEL",
      actorId: actorId || authContext.userId,
      entityType: "EMPLOYEE_BRANCH_ASSIGNMENT",
      entityId: shift._id,
      branchId: shift.branchId,
      before: beforeState,
      after: shift.toObject(),
    });

    return shift;
  }

  /**
   * End an active temporary branch shift early.
   */
  async endBranchShiftEarly(shiftId, endEffectiveDateStr, actorId, authContext = {}) {
    this._assertCanManageShifts(authContext);

    if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
      throw ApiError.badRequest("Invalid shift ID format.");
    }

    const shift = await EmployeeBranchAssignment.findById(shiftId);
    if (!shift || shift.assignmentType !== "TEMPORARY") {
      throw ApiError.notFound("Temporary branch shift not found.");
    }

    if (shift.status === "CANCELLED") {
      throw ApiError.badRequest("Cannot end a cancelled shift early.");
    }

    const effectiveDateStr = endEffectiveDateStr
      ? String(endEffectiveDateStr).trim().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const fromStr = shift.fromDate ? new Date(shift.fromDate).toISOString().slice(0, 10) : "";
    const toStr = shift.toDate ? new Date(shift.toDate).toISOString().slice(0, 10) : "";

    if (effectiveDateStr < fromStr) {
      throw ApiError.badRequest("Early end date cannot be earlier than shift start date.");
    }

    if (toStr && effectiveDateStr >= toStr) {
      throw ApiError.badRequest("Early end date must be earlier than the currently scheduled end date.");
    }

    const beforeState = shift.toObject();

    shift.toDate = new Date(`${effectiveDateStr}T23:59:59.999Z`);
    shift.status = "COMPLETED";
    shift.endedEarlyAt = new Date();
    shift.endedEarlyBy = actorId || authContext.userId;
    await shift.save();

    await AuditHelper.log({
      action: "EMPLOYEE_BRANCH_SHIFT_END_EARLY",
      actorId: actorId || authContext.userId,
      entityType: "EMPLOYEE_BRANCH_ASSIGNMENT",
      entityId: shift._id,
      branchId: shift.branchId,
      before: beforeState,
      after: shift.toObject(),
    });

    return shift;
  }

  /**
   * Helper: Resolves any active temporary branch shift for an employee on a given calendar date string (YYYY-MM-DD).
   */
  async getEffectiveShiftForDate(employeeId, attendanceDateStr) {
    if (!employeeId || !attendanceDateStr) return null;
    const targetDate = new Date(`${attendanceDateStr}T12:00:00.000Z`);

    return EmployeeBranchAssignment.findOne({
      employeeId: this._idIn(employeeId),
      assignmentType: "TEMPORARY",
      status: { $ne: "CANCELLED" },
      fromDate: { $lte: targetDate },
      toDate: { $gte: targetDate },
    })
      .populate("branchId", "name code")
      .populate("sourceBranchId", "name code")
      .lean();
  }

  /**
   * Helper: Returns all active temporary shifts relevant to a branch on a given date (both shifted-in and shifted-out).
   */
  async getShiftsForBranchAndDate(branchId, attendanceDateStr) {
    if (!branchId || !attendanceDateStr) return { shiftedIn: [], shiftedOut: [] };
    const targetDate = new Date(`${attendanceDateStr}T12:00:00.000Z`);
    const bId = this._idIn(branchId);

    const active = {
      assignmentType: "TEMPORARY",
      status: { $ne: "CANCELLED" },
      fromDate: { $lte: targetDate },
      toDate: { $gte: targetDate },
    };
    const employeePopulate = {
      path: "employeeId",
      populate: [
        { path: "roleId", select: "name code" },
      ],
    };

    const [shiftedIn, shiftedOut] = await Promise.all([
      // Employees temporarily shifted into this branch
      EmployeeBranchAssignment.find({ ...active, branchId: bId })
        .populate(employeePopulate)
        .populate("sourceBranchId", "name code")
        .lean(),

      // Employees whose home is this branch but are temporarily shifted out to another branch
      EmployeeBranchAssignment.find({ ...active, sourceBranchId: bId })
        .populate(employeePopulate)
        .populate("branchId", "name code")
        .lean(),
    ]);

    return { shiftedIn, shiftedOut };
  }
}

module.exports = new EmployeeShiftService();

