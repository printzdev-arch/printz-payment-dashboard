const mongoose = require("mongoose");
const DailyAttendance = require("../models/DailyAttendance");
const Employee = require("../../employees/models/Employee");
const Branch = require("../../branches/models/Branch");

const attendancePolicyService = require("./attendancePolicy.service");
const holidayCalendarService = require("./holidayCalendar.service");
const AttendanceCalculationService = require("./attendanceCalculation.service");
const employeeShiftService = require("../../employee-shift/services/employeeShift.service");
const attendanceDateUtils = require("../../../utils/helpers/attendanceDateUtils");
const ApiError = require("../../../utils/errors/ApiError");

class DailyAttendanceService {
  // ─── Authorization Helpers ───────────────────────────────────────────────

  _extractAuthorizedBranchIds(authContext = {}) {
    return (authContext.authorizedBranchIds || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);
  }

  _isSuperAdmin(authContext = {}) {
    return Boolean(authContext.isSuperAdmin);
  }

  _assertBranchAuthorized(targetBranchId, authContext = {}) {
    if (this._isSuperAdmin(authContext)) return;
    if (!targetBranchId) {
      throw ApiError.forbidden("Access denied: Target branch assignment is missing.");
    }

    const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
    if (authorizedBranchIds.length === 0) {
      throw ApiError.forbidden("Access denied: You have no authorized branch assignments.");
    }

    const tStr = targetBranchId._id ? targetBranchId._id.toString() : targetBranchId.toString();
    if (!authorizedBranchIds.includes(tStr)) {
      throw ApiError.forbidden("Access denied: You are not authorized for the specified branch.");
    }
  }

  /**
   * Asserts administrative role for creating, updating, or deleting attendance records manually.
   * Restricts Branch Managers and floor supervisors to check-in/out and batch punch.
   */
  _assertCanManageAdministrativeAttendance(authContext = {}) {
    if (this._isSuperAdmin(authContext)) return;
    const role = (authContext.role || "").toUpperCase();
    if (["MANAGER", "BRANCH_MANAGER", "EMPLOYEE", "STAFF"].includes(role)) {
      throw ApiError.forbidden(
        "Access denied: Administrative attendance management (manual create, update, delete) requires Admin or HR Admin privileges. Branch Managers must use check-in, check-out, or batch-punch."
      );
    }
  }

  /**
   * Creates an immutable snapshot of an attendance policy for historical calculation preservation.
   */
  _createPolicySnapshot(policy) {
    if (!policy) return null;
    return {
      policyId: policy._id || null,
      name: policy.name || "",
      code: policy.code || "",
      workingHoursPerDay: Number(policy.workingHoursPerDay) || 8,
      shiftStartTime: policy.shiftStartTime || "09:00",
      shiftEndTime: policy.shiftEndTime || "18:00",
      lateGraceMinutes: Number(policy.lateGraceMinutes) || 0,
      earlyCheckoutGraceMinutes: Number(policy.earlyCheckoutGraceMinutes) || 0,
      breakDurationMinutes: Number(policy.breakDurationMinutes) || 0,
      halfDayHours: Number(policy.halfDayHours) || 4,
      fullDayHours: Number(policy.fullDayHours) || 8,
      weeklyOffDays: Array.isArray(policy.weeklyOffDays) ? policy.weeklyOffDays : [],
      monthlyLeaveAllowance: Number(policy.monthlyLeaveAllowance) || 0,
      overtimeEnabled: Boolean(policy.overtimeEnabled),
      snapshotAt: new Date(),
    };
  }

  /**
   * Helper to build flexible filter supporting both String and ObjectId BSON types
   */
  _toIdFilter(val) {
    if (!val) return val;
    if (Array.isArray(val)) {
      const set = new Set();
      const result = [];
      for (const v of val) {
        if (!v) continue;
        const s = v._id ? v._id.toString() : v.toString();
        if (!set.has(s)) {
          set.add(s);
          result.push(s);
          if (mongoose.Types.ObjectId.isValid(s)) {
            result.push(new mongoose.Types.ObjectId(s));
          }
        }
      }
      return { $in: result };
    }
    const s = val._id ? val._id.toString() : val.toString();
    if (mongoose.Types.ObjectId.isValid(s)) {
      return { $in: [s, new mongoose.Types.ObjectId(s)] };
    }
    return s;
  }

  /**
   * Helper to get integer day-of-week (0=Sunday, 6=Saturday) in local/IST for YYYY-MM-DD
   */
  _getDayOfWeek(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  /**
   * Resolves the one branch attendance may be recorded at for an employee on a date.
   * Normally this is the home branch; while the employee has an active temporary
   * branch shift it is the destination branch only.
   */
  async _assertAndResolveEffectiveBranch(employee, targetBranchId, attendanceDate) {
    const homeBranchId = employee.branchId ? (employee.branchId._id || employee.branchId) : null;
    if (!homeBranchId) {
      throw ApiError.badRequest("Employee has no assigned branch.");
    }
    const targetStr = targetBranchId ? (targetBranchId._id || targetBranchId).toString() : null;

    const shift = await employeeShiftService.getEffectiveShiftForDate(employee._id, attendanceDate);
    if (shift) {
      const destBranch = shift.branchId || {};
      const destId = destBranch._id || destBranch;
      const destName = destBranch.name || "the destination branch";
      if (targetStr && targetStr !== destId.toString()) {
        const where = targetStr === homeBranchId.toString() ? "the home branch" : "the specified branch";
        throw ApiError.badRequest(
          `Employee '${employee.name}' (${employee.employeeCode}) is temporarily shifted to ${destName} on ${attendanceDate}. Attendance must be recorded at ${destName}, not ${where}.`
        );
      }
      return { branchId: destId, isShifted: true, shift };
    }

    if (targetStr && targetStr !== homeBranchId.toString()) {
      throw ApiError.badRequest(
        `Employee '${employee.name}' (${employee.employeeCode}) belongs to another branch, not the specified branch.`
      );
    }
    return { branchId: homeBranchId, isShifted: false, shift: null };
  }
  // ─── Business Methods ────────────────────────────────────────────────────

  /** Prevent all manual attendance writes on an active branch mandatory holiday. */
  async _assertNotHoliday(branchId, attendanceDate) {
    const cleanDate = typeof attendanceDate === "string" ? attendanceDate.trim().split("T")[0] : attendanceDate;
    const { isHoliday, holiday, calendar } = await holidayCalendarService.resolveEffectiveCalendar(branchId, cleanDate);
    if (isHoliday) {
      throw ApiError.badRequest(
        "Attendance cannot be recorded because this is a mandatory holiday.",
        {
          code: "MANDATORY_HOLIDAY",
          branchId: String(branchId?._id || branchId),
          attendanceDate: cleanDate,
          holidayName: holiday?.name || "Holiday",
          holidayType: holiday?.type || "PUBLIC",
          holidayCalendarId: calendar?._id || null,
        }
      );
    }
    return { calendar, isHoliday: false, holiday: null };
  }

  _isPopulated(val) {
    if (!val || typeof val !== "object") return false;
    if (val instanceof mongoose.Types.ObjectId || val._bsontype === "ObjectID" || val._bsontype === "ObjectId") {
      return false;
    }
    return Boolean(val._id);
  }

  /**
   * Serializes a DailyAttendance document to standard API response projection,
   * removing unneeded employee/policy/calendar details and internal metadata.
   */
  serializeDailyAttendance(doc) {
    if (!doc) return null;
    const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };

    // Remove unwanted top-level fields
    delete obj.overtimeApprovedBy;
    delete obj.overtimeApprovedAt;
    delete obj.calculatedAt;
    delete obj.lockedAt;
    delete obj.lockedBy;
    delete obj.__v;

    // Project populated employee details (preserve only _id, employeeCode, name)
    if (this._isPopulated(obj.employeeId)) {
      obj.employeeId = {
        _id: obj.employeeId._id,
        employeeCode: obj.employeeId.employeeCode,
        name: obj.employeeId.name,
      };
    }

    // Project populated branch details (preserve only _id, code, name)
    if (this._isPopulated(obj.branchId)) {
      obj.branchId = {
        _id: obj.branchId._id,
        code: obj.branchId.code,
        name: obj.branchId.name,
      };
    }

    // Project populated attendance policy details (preserve only _id, workingHoursPerDay, shiftStartTime, shiftEndTime)
    if (this._isPopulated(obj.attendancePolicyId)) {
      obj.attendancePolicyId = {
        _id: obj.attendancePolicyId._id,
        workingHoursPerDay: obj.attendancePolicyId.workingHoursPerDay,
        shiftStartTime: obj.attendancePolicyId.shiftStartTime,
        shiftEndTime: obj.attendancePolicyId.shiftEndTime,
      };
    }

    // Project populated holiday calendar details (preserve only _id, year)
    if (this._isPopulated(obj.holidayCalendarId)) {
      obj.holidayCalendarId = {
        _id: obj.holidayCalendarId._id,
        year: obj.holidayCalendarId.year,
      };
    }

    // Format createdBy / updatedBy
    if (this._isPopulated(obj.createdBy)) {
      obj.createdBy = obj.createdBy._id;
    }
    if (this._isPopulated(obj.updatedBy)) {
      obj.updatedBy = obj.updatedBy._id;
    }

    return obj;
  }

  /**
   * Stage 3: Branch Manager Check-In Action (Web & Mobile App)
   * Records morning check-in for an employee belonging to the manager's branch
   */
  async recordCheckIn(data, actorId, authContext = {}) {
    let {
      employeeId,
      branchId,
      attendanceDate,
      checkIn,
      remarks = "",
      source = "WEB_MOBILE",
    } = data;

    if (!employeeId || !branchId) {
      throw ApiError.badRequest("employeeId and branchId are required for check-in.");
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw ApiError.badRequest("Invalid employee ID format.");
    }
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }

    if (!attendanceDate) {
      attendanceDate = attendanceDateUtils.getCurrentDateIST();
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
      throw ApiError.badRequest("attendanceDate must be in YYYY-MM-DD format.");
    }

    if (!checkIn) {
      checkIn = attendanceDateUtils.getCurrentTimeIST();
    } else if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(checkIn.trim())) {
      throw ApiError.badRequest("checkIn must be in HH:mm format (00:00 - 23:59).");
    }
    checkIn = checkIn.trim();

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw ApiError.notFound("Employee not found.");
    }
    const { branchId: empBranchId } = await this._assertAndResolveEffectiveBranch(employee, branchId, attendanceDate);

    this._assertBranchAuthorized(empBranchId, authContext);
    await this._assertNotHoliday(empBranchId, attendanceDate);

    let record = await DailyAttendance.findOne({
      employeeId,
      branchId,
      attendanceDate,
    });

    const effectivePolicy = await attendancePolicyService.resolveEffectivePolicy(branchId, employee.attendancePolicyId);
    const { calendar: effectiveCalendar, isHoliday, holiday } = await holidayCalendarService.resolveEffectiveCalendar(branchId, attendanceDate);
    const dayOfWeek = this._getDayOfWeek(attendanceDate);
    const weeklyOffDays = Array.isArray(effectivePolicy.weeklyOffDays) ? effectivePolicy.weeklyOffDays : [];
    const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

    if (record) {
      if (record.isLocked) {
        throw ApiError.badRequest("Attendance record is locked and cannot be modified.");
      }

      const calculation = AttendanceCalculationService.calculateAttendance({
        checkIn,
        checkOut: record.checkOut,
        status: record.status,
        permissions: record.permissions,
        permission: record.permission,
        overtimeHours: record.overtimeHours,
        policy: record.policySnapshot || effectivePolicy,
        isHoliday,
        isWeeklyOff,
      });

      const beforeState = record.toObject();
      record.checkIn = checkIn;
      record.workingHoursPerDay = calculation.workingHoursPerDay;
      record.paidWorkingHours = calculation.paidWorkingHours || 0;
      record.status = calculation.status;
      record.lateArrival = calculation.lateArrival;
      record.lateMinutes = calculation.lateMinutes || 0;
      record.earlyCheckout = calculation.earlyCheckout;
      record.earlyCheckoutMinutes = calculation.earlyCheckoutMinutes || 0;
      record.calculationStatus = calculation.calculationStatus;
      record.calculatedAt = calculation.calculatedAt;
      record.source = source || "WEB_MOBILE";
      if (!record.policySnapshot) {
        record.policySnapshot = this._createPolicySnapshot(effectivePolicy);
      }
      if (remarks) record.remarks = remarks;
      record.updatedBy = actorId || null;
      await record.save();

      await record.populate([
        { path: "employeeId", select: "name employeeCode" },
        { path: "branchId", select: "name code" },
        { path: "attendancePolicyId", select: "workingHoursPerDay shiftStartTime shiftEndTime" },
        { path: "holidayCalendarId", select: "year" },
      ]);

      return this.serializeDailyAttendance(record);
    }

    const calculation = AttendanceCalculationService.calculateAttendance({
      checkIn,
      checkOut: null,
      policy: effectivePolicy,
      isHoliday,
      isWeeklyOff,
    });

    let finalRemarks = remarks ? String(remarks).trim() : "";
    if (isHoliday && holiday?.name && !finalRemarks.includes(holiday.name)) {
      finalRemarks = finalRemarks ? `${finalRemarks} (Holiday: ${holiday.name})` : `Holiday: ${holiday.name}`;
    }

    record = await DailyAttendance.create({
      employeeId,
      branchId,
      attendanceDate,
      attendancePolicyId: effectivePolicy._id || null,
      policySnapshot: this._createPolicySnapshot(effectivePolicy),
      holidayCalendarId: effectiveCalendar ? effectiveCalendar._id : null,
      checkIn,
      checkOut: null,
      workingHoursPerDay: calculation.workingHoursPerDay,
      paidWorkingHours: calculation.paidWorkingHours || 0,
      status: calculation.status,
      source: source || "WEB_MOBILE",
      lateArrival: calculation.lateArrival,
      lateMinutes: calculation.lateMinutes || 0,
      earlyCheckout: false,
      earlyCheckoutMinutes: 0,
      overtimeHours: 0,
      overtimeStatus: "NONE",
      remarks: finalRemarks,
      calculationStatus: calculation.calculationStatus,
      calculatedAt: calculation.calculatedAt,
      createdBy: actorId || null,
      updatedBy: actorId || null,
    });

    await record.populate([
      { path: "employeeId", select: "name employeeCode" },
      { path: "branchId", select: "name code" },
      { path: "attendancePolicyId", select: "workingHoursPerDay shiftStartTime shiftEndTime" },
      { path: "holidayCalendarId", select: "year" },
    ]);

    return this.serializeDailyAttendance(record);
  }

  /**
   * Stage 3 & 4: Branch Manager Check-Out Action & Auto Calculation (Web & Mobile App)
   * Records evening check-out for an employee and calculates final status and overtime
   */
  async recordCheckOut(data, actorId, authContext = {}) {
    let {
      employeeId,
      branchId,
      attendanceDate,
      checkOut,
      remarks = "",
      source = "WEB_MOBILE",
    } = data;

    if (!employeeId || !branchId) {
      throw ApiError.badRequest("employeeId and branchId are required for check-out.");
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw ApiError.badRequest("Invalid employee ID format.");
    }
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }

    if (!attendanceDate) {
      attendanceDate = attendanceDateUtils.getCurrentDateIST();
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
      throw ApiError.badRequest("attendanceDate must be in YYYY-MM-DD format.");
    }

    if (!checkOut) {
      checkOut = attendanceDateUtils.getCurrentTimeIST();
    } else if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(checkOut.trim())) {
      throw ApiError.badRequest("checkOut must be in HH:mm format (00:00 - 23:59).");
    }
    checkOut = checkOut.trim();

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw ApiError.notFound("Employee not found.");
    }
    const { branchId: empBranchId } = await this._assertAndResolveEffectiveBranch(employee, branchId, attendanceDate);

    this._assertBranchAuthorized(empBranchId, authContext);
    await this._assertNotHoliday(empBranchId, attendanceDate);

    let record = await DailyAttendance.findOne({
      employeeId,
      branchId,
      attendanceDate,
    });

    const effectivePolicy = await attendancePolicyService.resolveEffectivePolicy(branchId, employee.attendancePolicyId);
    const { calendar: effectiveCalendar, isHoliday, holiday } = await holidayCalendarService.resolveEffectiveCalendar(branchId, attendanceDate);
    const dayOfWeek = this._getDayOfWeek(attendanceDate);
    const weeklyOffDays = Array.isArray(effectivePolicy.weeklyOffDays) ? effectivePolicy.weeklyOffDays : [];
    const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

    if (record) {
      if (record.isLocked) {
        throw ApiError.badRequest("Attendance record is locked and cannot be modified.");
      }

      const calculation = AttendanceCalculationService.calculateAttendance({
        checkIn: record.checkIn,
        checkOut,
        status: record.status,
        permissions: record.permissions,
        permission: record.permission,
        overtimeHours: record.overtimeHours,
        policy: record.policySnapshot || effectivePolicy,
        isHoliday,
        isWeeklyOff,
      });

      const beforeState = record.toObject();
      record.checkOut = checkOut;
      record.workingHoursPerDay = calculation.workingHoursPerDay;
      record.paidWorkingHours = calculation.paidWorkingHours || 0;
      record.status = calculation.status;
      record.lateArrival = calculation.lateArrival;
      record.lateMinutes = calculation.lateMinutes || 0;
      record.earlyCheckout = calculation.earlyCheckout;
      record.earlyCheckoutMinutes = calculation.earlyCheckoutMinutes || 0;
      record.overtimeHours = calculation.overtimeHours || 0;
      record.calculationStatus = calculation.calculationStatus;
      record.calculatedAt = calculation.calculatedAt;
      record.source = source || "WEB_MOBILE";
      if (!record.policySnapshot) {
        record.policySnapshot = this._createPolicySnapshot(effectivePolicy);
      }
      if (remarks) record.remarks = remarks;
      record.updatedBy = actorId || null;
      await record.save();

      await record.populate([
        { path: "employeeId", select: "name employeeCode" },
        { path: "branchId", select: "name code" },
        { path: "attendancePolicyId", select: "workingHoursPerDay shiftStartTime shiftEndTime" },
        { path: "holidayCalendarId", select: "year" },
      ]);

      return this.serializeDailyAttendance(record);
    }

    const calculation = AttendanceCalculationService.calculateAttendance({
      checkIn: null,
      checkOut,
      policy: effectivePolicy,
      isHoliday,
      isWeeklyOff,
    });

    let finalRemarks = remarks ? String(remarks).trim() : "";
    if (isHoliday && holiday?.name && !finalRemarks.includes(holiday.name)) {
      finalRemarks = finalRemarks ? `${finalRemarks} (Holiday: ${holiday.name})` : `Holiday: ${holiday.name}`;
    }

    record = await DailyAttendance.create({
      employeeId,
      branchId,
      attendanceDate,
      attendancePolicyId: effectivePolicy._id || null,
      policySnapshot: this._createPolicySnapshot(effectivePolicy),
      holidayCalendarId: effectiveCalendar ? effectiveCalendar._id : null,
      checkIn: null,
      checkOut,
      workingHoursPerDay: calculation.workingHoursPerDay,
      paidWorkingHours: calculation.paidWorkingHours || 0,
      status: calculation.status,
      source: source || "WEB_MOBILE",
      lateArrival: false,
      lateMinutes: 0,
      earlyCheckout: calculation.earlyCheckout,
      earlyCheckoutMinutes: calculation.earlyCheckoutMinutes || 0,
      overtimeHours: 0,
      overtimeStatus: "NONE",
      remarks: finalRemarks,
      calculationStatus: calculation.calculationStatus,
      calculatedAt: calculation.calculatedAt,
      createdBy: actorId || null,
      updatedBy: actorId || null,
    });

    await record.populate([
      { path: "employeeId", select: "name employeeCode" },
      { path: "branchId", select: "name code" },
      { path: "attendancePolicyId", select: "workingHoursPerDay shiftStartTime shiftEndTime" },
      { path: "holidayCalendarId", select: "year" },
    ]);

    return this.serializeDailyAttendance(record);
  }

  /**
   * Batch Punch Action for Branch Managers (Web & Mobile App)
   * Quickly records check-in or check-out for multiple employees of the branch at once
   */
  async batchPunch(data, actorId, authContext = {}) {
    let {
      branchId,
      attendanceDate,
      type, // "CHECK_IN" or "CHECK_OUT"
      employeeIds = [],
      time,
      remarks = "",
    } = data;

    if (!branchId || !type) {
      throw ApiError.badRequest("branchId and punch type ('CHECK_IN' or 'CHECK_OUT') are required.");
    }
    if (!["CHECK_IN", "CHECK_OUT"].includes(type)) {
      throw ApiError.badRequest("punch type must be 'CHECK_IN' or 'CHECK_OUT'.");
    }
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw ApiError.badRequest("employeeIds must be a non-empty array.");
    }

    if (!attendanceDate) {
      attendanceDate = attendanceDateUtils.getCurrentDateIST();
    }
    if (!time) {
      time = attendanceDateUtils.getCurrentTimeIST();
    }

    this._assertBranchAuthorized(branchId, authContext);
    await this._assertNotHoliday(branchId, attendanceDate);
    await attendancePolicyService.resolveEffectivePolicy(branchId);

    const results = {
      type,
      total: employeeIds.length,
      successCount: 0,
      failedCount: 0,
      items: [],
      errors: [],
    };

    for (const empId of employeeIds) {
      try {
        let res;
        if (type === "CHECK_IN") {
          res = await this.recordCheckIn(
            { employeeId: empId, branchId, attendanceDate, checkIn: time, remarks, source: "WEB_MOBILE" },
            actorId,
            authContext
          );
        } else {
          res = await this.recordCheckOut(
            { employeeId: empId, branchId, attendanceDate, checkOut: time, remarks, source: "WEB_MOBILE" },
            actorId,
            authContext
          );
        }
        results.successCount++;
        results.items.push(res);
      } catch (err) {
        results.failedCount++;
        results.errors.push({ employeeId: empId, message: err.message });
      }
    }

    return results;
  }

  /**
   * Create an attendance record
   */
  async createAttendance(data, actorId, authContext = {}) {
    this._assertCanManageAdministrativeAttendance(authContext);

    const {
      employeeId,
      branchId: rawBranchId,
      attendanceDate,
      checkIn = null,
      checkOut = null,
      status = null,
      source = "WEB_MOBILE",
      permission = null,
      overtimeHours = null,
      remarks = "",
      leavePaymentType = null,
    } = data;
    let branchId = rawBranchId;

    if (!employeeId || !attendanceDate) {
      throw ApiError.badRequest("employeeId and attendanceDate (YYYY-MM-DD) are required.");
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw ApiError.badRequest("Invalid employee ID format.");
    }

    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
      throw ApiError.badRequest("attendanceDate must be in YYYY-MM-DD format.");
    }

    const todayStr = attendanceDateUtils.getCurrentDateIST();
    if (status === "ABSENT" && attendanceDate >= todayStr) {
      throw ApiError.badRequest(
        `Cannot mark ABSENT for current or future date (${attendanceDate}). Absence can only be assigned after the relevant workday has ended.`
      );
    }

    if (status === "ON_LEAVE" && !["PAID", "UNPAID"].includes(leavePaymentType)) {
      throw ApiError.badRequest(
        "leavePaymentType (PAID or UNPAID) is required when status is ON_LEAVE, because payroll treats paid and unpaid leave differently."
      );
    }

    // Verify employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw ApiError.notFound("Employee not found.");
    }

    // Resolve the branch attendance belongs to on this date (home branch, or the
    // destination branch while the employee is temporarily shifted)
    const { branchId: empBranchId } = await this._assertAndResolveEffectiveBranch(employee, branchId, attendanceDate);
    if (!branchId) branchId = empBranchId;

    // Branch authorization check
    this._assertBranchAuthorized(empBranchId, authContext);

    // Resolve active holiday calendar and assert attendance date is not a mandatory holiday
    await this._assertNotHoliday(empBranchId, attendanceDate);

    // Check for existing record
    const existing = await DailyAttendance.findOne({
      employeeId,
      attendanceDate,
    });
    if (existing) {
      throw ApiError.conflict(
        `Attendance already exists for employee '${employee.name}' on date ${attendanceDate}. Use PUT to update.`
      );
    }

    // 1. Resolve Effective Policy
    const effectivePolicy = await attendancePolicyService.resolveEffectivePolicy(
      empBranchId,
      employee.attendancePolicyId
    );

    // 2. Resolve Effective Holiday Calendar & Check if date is holiday
    const { calendar: effectiveCalendar, isHoliday, isOptionalHoliday, holiday } =
      await holidayCalendarService.resolveEffectiveCalendar(empBranchId, attendanceDate);

    // 3. Check if date is weekly off (7-day work week defaults to empty array, Sunday is a regular workday)
    const dayOfWeek = this._getDayOfWeek(attendanceDate);
    const weeklyOffDays = Array.isArray(effectivePolicy.weeklyOffDays) ? effectivePolicy.weeklyOffDays : [];
    const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

    // 4. Calculate attendance metrics
    const calculation = AttendanceCalculationService.calculateAttendance({
      checkIn,
      checkOut,
      status,
      permission,
      overtimeHours,
      policy: effectivePolicy,
      isHoliday,
      isWeeklyOff,
    });

    // Determine final remarks if worked on holiday or weekly off
    let finalRemarks = remarks ? String(remarks).trim() : "";
    if (isHoliday && holiday?.name && !finalRemarks.includes(holiday.name)) {
      finalRemarks = finalRemarks ? `${finalRemarks} (Holiday: ${holiday.name})` : `Holiday: ${holiday.name}`;
    } else if (isWeeklyOff && !finalRemarks.includes("Weekly Off")) {
      finalRemarks = finalRemarks ? `${finalRemarks} (Weekly Off)` : "Weekly Off";
    }

    const attendanceRecord = await DailyAttendance.create({
      employeeId,
      branchId,
      attendanceDate,
      attendancePolicyId: effectivePolicy._id || null,
      policySnapshot: this._createPolicySnapshot(effectivePolicy),
      holidayCalendarId: effectiveCalendar ? effectiveCalendar._id : null,
      checkIn: checkIn ? checkIn.trim() : null,
      checkOut: checkOut ? checkOut.trim() : null,
      workingHoursPerDay: calculation.workingHoursPerDay,
      paidWorkingHours: calculation.paidWorkingHours || 0,
      status: calculation.status,
      leavePaymentType: calculation.status === "ON_LEAVE" ? leavePaymentType : null,
      source: source || "WEB_MOBILE",
      lateArrival: calculation.lateArrival,
      lateMinutes: calculation.lateMinutes || 0,
      earlyCheckout: calculation.earlyCheckout,
      earlyCheckoutMinutes: calculation.earlyCheckoutMinutes || 0,
      overtimeHours: calculation.overtimeHours || 0,
      overtimeStatus: "NONE",
      overtimeApprovedBy: null,
      overtimeApprovedAt: null,
      permission: permission && Number(permission.durationHours) > 0 ? {
        durationHours: Number(permission.durationHours),
        startTime: permission.startTime || null,
        endTime: permission.endTime || null,
        reason: permission.reason || "",
      } : null,
      remarks: finalRemarks,
      calculationStatus: calculation.calculationStatus,
      calculatedAt: calculation.calculatedAt,
      createdBy: actorId || null,
      updatedBy: actorId || null,
    });

    await attendanceRecord.populate([
      { path: "employeeId", select: "name employeeCode" },
      { path: "branchId", select: "name code" },
      { path: "attendancePolicyId", select: "workingHoursPerDay shiftStartTime shiftEndTime" },
      { path: "holidayCalendarId", select: "year" },
    ]);

    return this.serializeDailyAttendance(attendanceRecord);
  }

  /**
   * Retrieve list of attendance records with filters and pagination
   */
  async getAttendance(filters = {}, pagination = {}, authContext = {}) {
    const query = {};

    // Branch scoping
    if (!this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      if (authorizedBranchIds.length === 0) {
        return { records: [], total: 0, page: 1, pages: 1 };
      }
      query.branchId = this._toIdFilter(authorizedBranchIds);
    }

    if (filters.branchId) {
      if (typeof filters.branchId === "string" && !mongoose.Types.ObjectId.isValid(filters.branchId)) {
        throw ApiError.badRequest("Invalid branch ID format.");
      }
      this._assertBranchAuthorized(filters.branchId, authContext);
      query.branchId = this._toIdFilter(filters.branchId);
    }

    if (filters.employeeId) {
      if (typeof filters.employeeId === "string" && !mongoose.Types.ObjectId.isValid(filters.employeeId)) {
        throw ApiError.badRequest("Invalid employee ID format.");
      }
      if (!this._isSuperAdmin(authContext)) {
        const emp = await Employee.findById(filters.employeeId);
        if (emp && emp.branchId) {
          this._assertBranchAuthorized(emp.branchId, authContext);
        }
      }
      query.employeeId = this._toIdFilter(filters.employeeId);
    }

    if (filters.attendanceDate) {
      query.attendanceDate = filters.attendanceDate;
    } else if (filters.startDate || filters.endDate) {
      query.attendanceDate = {};
      if (filters.startDate) query.attendanceDate.$gte = filters.startDate;
      if (filters.endDate) query.attendanceDate.$lte = filters.endDate;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status.toUpperCase();
      }
    }

    if (filters.lateArrival !== undefined) {
      query.lateArrival = filters.lateArrival === "true" || filters.lateArrival === true;
    }

    if (filters.earlyCheckout !== undefined) {
      query.earlyCheckout = filters.earlyCheckout === "true" || filters.earlyCheckout === true;
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.max(1, parseInt(pagination.limit, 10) || 50);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      DailyAttendance.find(query)
        .select("-overtimeApprovedBy -overtimeApprovedAt -calculatedAt -lockedAt -lockedBy")
        .populate("employeeId", "name employeeCode")
        .populate("branchId", "name code")
        .populate("attendancePolicyId", "workingHoursPerDay shiftStartTime shiftEndTime")
        .populate("holidayCalendarId", "year")
        .sort({ attendanceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DailyAttendance.countDocuments(query),
    ]);

    return {
      records: records.map((r) => this.serializeDailyAttendance(r)),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single attendance record by ID
   */
  async getAttendanceById(id, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid attendance record ID format.");
    }

    const record = await DailyAttendance.findById(id)
      .select("-overtimeApprovedBy -overtimeApprovedAt -calculatedAt -lockedAt -lockedBy")
      .populate("employeeId", "name employeeCode")
      .populate("branchId", "name code")
      .populate("attendancePolicyId", "workingHoursPerDay shiftStartTime shiftEndTime")
      .populate("holidayCalendarId", "year")
      .lean();

    if (!record) {
      throw ApiError.notFound("Daily attendance record not found.");
    }

    this._assertBranchAuthorized(record.branchId, authContext);
    return this.serializeDailyAttendance(record);
  }

  /**
   * Update an existing attendance record (corrections / adjustments)
   */
  async updateAttendance(id, data, actorId, authContext = {}) {
    this._assertCanManageAdministrativeAttendance(authContext);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid attendance record ID format.");
    }

    const existing = await DailyAttendance.findById(id);
    if (!existing) {
      throw ApiError.notFound("Daily attendance record not found.");
    }

    if (existing.isLocked && !authContext.isSuperAdminOnly) {
      throw ApiError.conflict(
        "Attendance record is locked/finalized and cannot be modified without Super Admin authorization.",
        { code: "ATTENDANCE_RECORD_LOCKED", recordId: existing._id }
      );
    }

    const beforeState = existing.toObject();

    const targetBranchId = data.branchId || existing.branchId;
    const targetDate = data.attendanceDate ? String(data.attendanceDate).trim() : existing.attendanceDate;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw ApiError.badRequest("attendanceDate must be in YYYY-MM-DD format.");
    }

    this._assertBranchAuthorized(existing.branchId, authContext);

    if (data.branchId) {
      if (!mongoose.Types.ObjectId.isValid(data.branchId)) {
        throw ApiError.badRequest("Invalid branch ID format.");
      }
      this._assertBranchAuthorized(data.branchId, authContext);
    }

    // Reject if target date is a mandatory holiday for target branch
    await this._assertNotHoliday(targetBranchId, targetDate);

    if (data.attendanceDate && data.attendanceDate !== existing.attendanceDate) {
      const duplicate = await DailyAttendance.findOne({
        _id: { $ne: existing._id },
        employeeId: existing.employeeId,
        attendanceDate: targetDate,
      });
      if (duplicate) {
        throw ApiError.conflict(
          `Attendance already exists for this employee on date ${targetDate}.`
        );
      }
      existing.attendanceDate = targetDate;
    }

    if (data.branchId && data.branchId.toString() !== existing.branchId.toString()) {
      existing.branchId = data.branchId;
    }

    const checkIn = data.checkIn !== undefined ? data.checkIn : existing.checkIn;
    const checkOut = data.checkOut !== undefined ? data.checkOut : existing.checkOut;
    const status = data.status !== undefined ? data.status : existing.status;
    const permission = data.permission !== undefined ? data.permission : existing.permission;
    const remarks = data.remarks !== undefined ? data.remarks : existing.remarks;
    const overtimeHours = data.overtimeHours !== undefined ? data.overtimeHours : existing.overtimeHours;
    const leavePaymentType = data.leavePaymentType !== undefined ? data.leavePaymentType : existing.leavePaymentType;

    const todayStr = attendanceDateUtils.getCurrentDateIST();
    if (status === "ABSENT" && targetDate >= todayStr) {
      throw ApiError.badRequest(
        `Cannot mark ABSENT for current or future date (${targetDate}). Absence can only be assigned after the relevant workday has ended.`
      );
    }

    if (status === "ON_LEAVE" && !["PAID", "UNPAID"].includes(leavePaymentType)) {
      throw ApiError.badRequest(
        "leavePaymentType (PAID or UNPAID) is required when status is ON_LEAVE, because payroll treats paid and unpaid leave differently."
      );
    }

    // Resolve policy and holiday context for recalculation
    let effectivePolicy;
    if (data.attendancePolicyId && data.attendancePolicyId.toString() !== existing.attendancePolicyId?.toString()) {
      effectivePolicy = await attendancePolicyService.resolveEffectivePolicy(
        targetBranchId,
        data.attendancePolicyId
      );
      existing.attendancePolicyId = effectivePolicy._id;
      existing.policySnapshot = this._createPolicySnapshot(effectivePolicy);
    } else if (existing.policySnapshot) {
      effectivePolicy = existing.policySnapshot;
    } else {
      effectivePolicy = await attendancePolicyService.resolveEffectivePolicy(
        targetBranchId,
        existing.attendancePolicyId
      );
      existing.policySnapshot = this._createPolicySnapshot(effectivePolicy);
    }

    const { calendar: effectiveCalendar, isHoliday } = await holidayCalendarService.resolveEffectiveCalendar(
      targetBranchId,
      targetDate
    );
    existing.holidayCalendarId = effectiveCalendar ? effectiveCalendar._id : null;

    const dayOfWeek = this._getDayOfWeek(targetDate);
    const weeklyOffDays = Array.isArray(effectivePolicy.weeklyOffDays) ? effectivePolicy.weeklyOffDays : [];
    const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

    const calculation = AttendanceCalculationService.calculateAttendance({
      checkIn,
      checkOut,
      status,
      permissions: existing.permissions,
      permission,
      overtimeHours,
      policy: effectivePolicy,
      isHoliday,
      isWeeklyOff,
    });

    existing.checkIn = checkIn ? checkIn.trim() : null;
    existing.checkOut = checkOut ? checkOut.trim() : null;
    existing.workingHoursPerDay = calculation.workingHoursPerDay;
    existing.paidWorkingHours = calculation.paidWorkingHours || 0;
    existing.status = calculation.status;
    existing.leavePaymentType = calculation.status === "ON_LEAVE" ? leavePaymentType : null;
    existing.lateArrival = calculation.lateArrival;
    existing.lateMinutes = calculation.lateMinutes || 0;
    existing.earlyCheckout = calculation.earlyCheckout;
    existing.earlyCheckoutMinutes = calculation.earlyCheckoutMinutes || 0;
    existing.overtimeHours = calculation.overtimeHours || 0;
    existing.calculationStatus = calculation.calculationStatus;
    existing.calculatedAt = calculation.calculatedAt;
    existing.remarks = remarks !== undefined ? String(remarks).trim() : existing.remarks;
    if (permission) {
      existing.permission = {
        durationHours: Number(permission.durationHours) || 0,
        startTime: permission.startTime || null,
        endTime: permission.endTime || null,
        reason: permission.reason || "",
      };
    }
    existing.updatedBy = actorId || null;

    await existing.save();

    await existing.populate([
      { path: "employeeId", select: "name employeeCode" },
      { path: "branchId", select: "name code" },
      { path: "attendancePolicyId", select: "workingHoursPerDay shiftStartTime shiftEndTime" },
      { path: "holidayCalendarId", select: "year" },
    ]);

    return this.serializeDailyAttendance(existing);
  }

  /**
   * DELETE an attendance record
   */
  async deleteAttendance(id, actorId, authContext) {
    this._assertCanManageAdministrativeAttendance(authContext);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid attendance record ID format.");
    }

    const existing = await DailyAttendance.findById(id);
    if (!existing) {
      throw ApiError.notFound("Daily attendance record not found.");
    }

    if (existing.isLocked && !authContext.isSuperAdminOnly) {
      throw ApiError.conflict(
        "Attendance record is locked/finalized and cannot be deleted.",
        { code: "ATTENDANCE_RECORD_LOCKED", recordId: existing._id }
      );
    }

    this._assertBranchAuthorized(existing.branchId, authContext);

    const beforeState = existing.toObject();
    await DailyAttendance.findByIdAndDelete(id);

    return { _id: id, message: "Attendance record deleted successfully." };
  }

  /**
   * Get attendance summary for dashboard and reports
   */
  async getAttendanceSummary({ branchId, date, startDate, endDate, employeeId, month, year } = {}, authContext = {}) {
    const query = {};

    if (!this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      if (authorizedBranchIds.length === 0) {
        return { total: 0, present: 0, absent: 0, halfDay: 0, onLeave: 0, holiday: 0, weeklyOff: 0 };
      }
      query.branchId = this._toIdFilter(authorizedBranchIds);
    }

    if (branchId) {
      if (typeof branchId === "string" && !mongoose.Types.ObjectId.isValid(branchId)) {
        throw ApiError.badRequest("Invalid branch ID format.");
      }
      this._assertBranchAuthorized(branchId, authContext);
      query.branchId = this._toIdFilter(branchId);
    }

    if (employeeId) {
      if (typeof employeeId === "string" && !mongoose.Types.ObjectId.isValid(employeeId)) {
        throw ApiError.badRequest("Invalid employee ID format.");
      }
      if (!this._isSuperAdmin(authContext)) {
        const emp = await Employee.findById(employeeId);
        if (emp && emp.branchId) {
          this._assertBranchAuthorized(emp.branchId, authContext);
        }
      }
      query.employeeId = this._toIdFilter(employeeId);
    }

    // Resolve month & year if passed or inferred from date range
    let targetMonth = null;
    let targetYear = null;

    if (month && year) {
      const parsed = attendanceDateUtils.parseMonthYear(month, year);
      if (!parsed) {
        throw ApiError.badRequest("Invalid month (1-12) or year (2000-2100) provided.");
      }
      targetMonth = parsed.month;
      targetYear = parsed.year;
    } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m] = date.split("-").map(Number);
      targetYear = y;
      targetMonth = m;
    } else if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const [y, m] = startDate.split("-").map(Number);
      if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        const [ey, em] = endDate.split("-").map(Number);
        if (y === ey && m === em) {
          targetYear = y;
          targetMonth = m;
        }
      }
    }

    if (month && year && (!startDate || !endDate)) {
      const range = attendanceDateUtils.getMonthDateRange(targetYear, targetMonth);
      query.attendanceDate = { $gte: range.startDate, $lte: range.endDate };
    } else if (date) {
      query.attendanceDate = date;
    } else if (startDate || endDate) {
      query.attendanceDate = {};
      if (startDate) query.attendanceDate.$gte = startDate;
      if (endDate) query.attendanceDate.$lte = endDate;
    }

    const records = await DailyAttendance.find(query).lean();

    // Fetch effective policy to resolve monthlyLeaveAllowance
    let monthlyLeaveAllowance = 4;
    try {
      const effectivePolicy = await attendancePolicyService.resolveEffectivePolicy(branchId);
      if (effectivePolicy && Number.isFinite(Number(effectivePolicy.monthlyLeaveAllowance))) {
        monthlyLeaveAllowance = Number(effectivePolicy.monthlyLeaveAllowance);
      }
    } catch {
      monthlyLeaveAllowance = 4;
    }

    const calendarDays = targetMonth && targetYear
      ? attendanceDateUtils.getCalendarDaysInMonth(targetYear, targetMonth)
      : 0;
    const expectedWorkingDays = targetMonth && targetYear
      ? attendanceDateUtils.calculateExpectedWorkingDays(targetYear, targetMonth, monthlyLeaveAllowance)
      : 0;

    const distinctWorkedDates = new Set();
    const distinctHalfDayDates = new Set();
    const distinctLeaveDates = new Set();
    const distinctAbsentDates = new Set();
    const distinctPendingDates = new Set();
    const seenEmpDates = new Set();

    let totalWorkingHours = 0;
    let totalPaidWorkingHours = 0;
    let totalOvertimeHours = 0;
    let approvedOvertimeHours = 0;
    let totalPermissionHours = 0;
    let lateArrivalCount = 0;
    let earlyCheckoutCount = 0;
    let holidayCount = 0;
    let weeklyOffCount = 0;

    for (const r of records) {
      const dateKey = r.attendanceDate;
      const empDateKey = `${(r.employeeId?._id || r.employeeId || "").toString()}_${dateKey}`;
      const uniqueKey = employeeId ? dateKey : empDateKey;

      if (seenEmpDates.has(uniqueKey)) {
        continue; // Deduplicate: do not allow duplicate records to inflate summary totals
      }
      seenEmpDates.add(uniqueKey);

      if (r.status === "PRESENT") {
        distinctWorkedDates.add(uniqueKey);
      } else if (r.status === "HALF_DAY") {
        distinctHalfDayDates.add(uniqueKey);
      } else if (r.status === "ON_LEAVE") {
        distinctLeaveDates.add(uniqueKey);
      } else if (r.status === "ABSENT") {
        distinctAbsentDates.add(uniqueKey);
      } else if (r.status === "PENDING" || r.calculationStatus === "PENDING") {
        distinctPendingDates.add(uniqueKey);
      } else if (r.status === "HOLIDAY") {
        holidayCount++;
      } else if (r.status === "WEEKLY_OFF") {
        weeklyOffCount++;
      }

      if (r.status !== "PENDING" && r.calculationStatus !== "PENDING") {
        totalWorkingHours += Number(r.workingHoursPerDay) || 0;
        totalPaidWorkingHours += Number(r.paidWorkingHours !== undefined ? r.paidWorkingHours : r.workingHoursPerDay) || 0;
        totalOvertimeHours += Number(r.overtimeHours) || 0;
        if (r.overtimeStatus === "APPROVED") {
          approvedOvertimeHours += Number(r.overtimeHours) || 0;
        }
      }

      if (r.permission && Number(r.permission.durationHours)) {
        totalPermissionHours += Number(r.permission.durationHours) || 0;
      }

      if (r.lateArrival) lateArrivalCount++;
      if (r.earlyCheckout) earlyCheckoutCount++;
    }

    totalWorkingHours = Math.round(totalWorkingHours * 100) / 100;
    totalPaidWorkingHours = Math.round(totalPaidWorkingHours * 100) / 100;
    totalOvertimeHours = Math.round(totalOvertimeHours * 100) / 100;
    approvedOvertimeHours = Math.round(approvedOvertimeHours * 100) / 100;
    totalPermissionHours = Math.round(totalPermissionHours * 100) / 100;

    // Derive holiday count from calendar if records do not contain holiday records
    if (holidayCount === 0) {
      let rangeStart = null;
      let rangeEnd = null;
      if (typeof query.attendanceDate === "string") {
        rangeStart = query.attendanceDate;
        rangeEnd = query.attendanceDate;
      } else if (query.attendanceDate && query.attendanceDate.$gte && query.attendanceDate.$lte) {
        rangeStart = query.attendanceDate.$gte;
        rangeEnd = query.attendanceDate.$lte;
      } else if (targetMonth && targetYear) {
        const mRange = attendanceDateUtils.getMonthDateRange(targetYear, targetMonth);
        rangeStart = mRange.startDate;
        rangeEnd = mRange.endDate;
      }

      if (rangeStart && rangeEnd) {
        try {
          const calHolidays = await holidayCalendarService.getHolidaysInRange(branchId, rangeStart, rangeEnd);
          holidayCount = calHolidays.length;
        } catch {
          // keep 0 if calendar lookup fails
        }
      }
    }

    const daysWorked = distinctWorkedDates.size;
    const halfDaysWorked = distinctHalfDayDates.size;
    const unpaidLeaveDaysTaken = distinctLeaveDates.size;
    const absentDays = distinctAbsentDates.size;
    const pendingAttendanceDays = distinctPendingDates.size;

    const workingDaysCount = daysWorked + halfDaysWorked + absentDays;
    let attendancePercentage = 0;
    if (workingDaysCount > 0) {
      const effectivePresent = daysWorked + (halfDaysWorked * 0.5);
      attendancePercentage = Math.round((effectivePresent / workingDaysCount) * 10000) / 100;
    }

    const summary = {
      employeeId: employeeId || null,
      branchId: branchId || null,
      month: targetMonth || null,
      year: targetYear || null,
      calendarDays,
      expectedWorkingDays,
      daysWorked,
      halfDaysWorked,
      unpaidLeaveDaysTaken,
      absentDays,
      totalWorkingHours,
      totalPaidWorkingHours,
      totalOvertimeHours,
      approvedOvertimeHours,
      totalPermissionHours,
      pendingAttendanceDays,

      // Backward compatible fields for existing tests and reports
      totalRecords: records.length,
      presentCount: daysWorked,
      absentCount: absentDays,
      halfDayCount: halfDaysWorked,
      onLeaveCount: unpaidLeaveDaysTaken,
      holidayCount,
      weeklyOffCount,
      totalHoursWorked: totalWorkingHours,
      overtimeHours: totalOvertimeHours,
      lateArrivalCount,
      earlyCheckoutCount,
      attendancePercentage,
      ...(targetMonth && targetYear ? {
        monthlyLeaveAllowance,
        daysPresent: daysWorked,
        daysAbsent: absentDays,
        halfDays: halfDaysWorked,
        leaveDaysTaken: unpaidLeaveDaysTaken,
        leaveDaysRemaining: Math.max(0, monthlyLeaveAllowance - unpaidLeaveDaysTaken),
      } : {}),
    };

    return summary;
  }

  /**
   * Finalize / Lock attendance records for a branch and date range
   */
  async finalizeAttendance({ branchId, startDate, endDate, attendanceDate } = {}, actorId, authContext = {}) {
    if (!branchId) {
      throw ApiError.badRequest("branchId is required to finalize attendance.");
    }
    this._assertBranchAuthorized(branchId, authContext);
    const roleNorm = (authContext.role || "").toUpperCase();
    if (roleNorm === "MANAGER" || roleNorm === "BRANCH_MANAGER" || roleNorm === "EMPLOYEE") {
      throw ApiError.forbidden("Access denied: Branch Managers cannot finalize or lock attendance periods.");
    }

    const query = { branchId: this._toIdFilter(branchId) };
    if (attendanceDate) {
      query.attendanceDate = attendanceDate;
    } else if (startDate || endDate) {
      query.attendanceDate = {};
      if (startDate) query.attendanceDate.$gte = startDate;
      if (endDate) query.attendanceDate.$lte = endDate;
    } else {
      throw ApiError.badRequest("attendanceDate or date range (startDate, endDate) is required to finalize attendance.");
    }

    const result = await DailyAttendance.updateMany(query, {
      $set: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: actorId || null,
      },
    });

    return {
      message: "Attendance records finalized and locked successfully.",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Reopen / Unlock attendance records (Super Admin only or authorized admin)
   */
  async reopenAttendance({ branchId, startDate, endDate, attendanceDate } = {}, actorId, authContext = {}) {
    if (!branchId) {
      throw ApiError.badRequest("branchId is required to reopen attendance.");
    }
    this._assertBranchAuthorized(branchId, authContext);
    if (!authContext.isSuperAdminOnly) {
      throw ApiError.forbidden("Access denied: Only Super Admin can reopen locked attendance periods.");
    }

    const query = { branchId: this._toIdFilter(branchId), isLocked: true };
    if (attendanceDate) {
      query.attendanceDate = attendanceDate;
    } else if (startDate || endDate) {
      query.attendanceDate = {};
      if (startDate) query.attendanceDate.$gte = startDate;
      if (endDate) query.attendanceDate.$lte = endDate;
    } else {
      throw ApiError.badRequest("attendanceDate or date range is required to reopen attendance.");
    }

    const result = await DailyAttendance.updateMany(query, {
      $set: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      },
    });

    return {
      message: "Attendance records reopened successfully.",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Controlled generation of holiday attendance records for active branch employees.
   * Admin-only method to populate holiday records in DailyAttendance.
   */
  async generateHolidayAttendanceRecords({ branchId, year, month, date } = {}, actorId, authContext = {}) {
    this._assertCanManageAdministrativeAttendance(authContext);
    if (!branchId) {
      throw ApiError.badRequest("branchId is required to generate holiday records.");
    }
    this._assertBranchAuthorized(branchId, authContext);

    let startDate, endDate;
    if (date) {
      startDate = date;
      endDate = date;
    } else if (year && month) {
      const range = attendanceDateUtils.getMonthDateRange(parseInt(year, 10), parseInt(month, 10));
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (year) {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      throw ApiError.badRequest("date, (year, month), or year is required.");
    }

    const holidays = await holidayCalendarService.getHolidaysInRange(branchId, startDate, endDate);
    if (holidays.length === 0) {
      return { message: "No mandatory holidays found in the specified range.", createdCount: 0, holidays: [] };
    }

    const employees = await Employee.find({
      branchId: this._toIdFilter(branchId),
      isActive: true,
      employmentStatus: "ACTIVE",
    }).lean();

    const policy = await attendancePolicyService.resolveEffectivePolicy(branchId);
    const policySnapshot = this._createPolicySnapshot(policy);

    let createdCount = 0;
    for (const h of holidays) {
      // Employees shifted out of this branch on the holiday are working elsewhere (no holiday
      // here), and employees shifted in observe this branch's holiday.
      const { shiftedIn, shiftedOut } = await employeeShiftService.getShiftsForBranchAndDate(branchId, h.date);
      const shiftedOutIds = new Set(shiftedOut.map((s) => String(s.employeeId?._id || s.employeeId)));
      const holidayRoster = employees.filter((e) => !shiftedOutIds.has(String(e._id)));
      for (const s of shiftedIn) {
        const e = s.employeeId;
        if (!e || typeof e !== "object" || !e._id || !e.isActive || e.employmentStatus !== "ACTIVE") continue;
        if (!holidayRoster.some((x) => String(x._id) === String(e._id))) holidayRoster.push(e);
      }

      // Who already has a record for this holiday, found with one query instead of one per employee
      const alreadyMarked = new Set(
        (
          await DailyAttendance.find({
            employeeId: { $in: holidayRoster.map((e) => e._id) },
            attendanceDate: h.date,
          })
            .select("employeeId")
            .lean()
        ).map((row) => String(row.employeeId))
      );

      for (const emp of holidayRoster) {
        if (!alreadyMarked.has(String(emp._id))) {
          await DailyAttendance.create({
            employeeId: emp._id,
            branchId,
            attendanceDate: h.date,
            attendancePolicyId: policy._id || null,
            policySnapshot,
            holidayCalendarId: h.calendarId || null,
            checkIn: null,
            checkOut: null,
            workingHoursPerDay: policy.workingHoursPerDay || 8,
            paidWorkingHours: policy.workingHoursPerDay || 8,
            status: "HOLIDAY",
            source: "SYSTEM",
            lateArrival: false,
            lateMinutes: 0,
            earlyCheckout: false,
            earlyCheckoutMinutes: 0,
            overtimeHours: 0,
            overtimeStatus: "NONE",
            remarks: `Holiday: ${h.name}`,
            calculationStatus: "CALCULATED",
            calculatedAt: new Date(),
            createdBy: actorId || null,
            updatedBy: actorId || null,
          });
          createdCount++;
        }
      }
    }

    return {
      message: `Successfully generated ${createdCount} holiday attendance record(s).`,
      holidays: holidays.map((h) => ({ date: h.date, name: h.name })),
      createdCount,
    };
  }
}

module.exports = new DailyAttendanceService();
