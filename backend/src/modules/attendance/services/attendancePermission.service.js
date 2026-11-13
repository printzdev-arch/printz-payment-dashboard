const mongoose = require("mongoose");
const AttendancePermission = require("../models/AttendancePermission");
const DailyAttendance = require("../models/DailyAttendance");
const Employee = require("../../employees/models/Employee");
const User = require("../../auth/models/User");
require("../../branches/models/Branch");
require("../models/AttendancePolicy");
const attendancePolicyService = require("./attendancePolicy.service");
const holidayCalendarService = require("./holidayCalendar.service");
const AttendanceCalculationService = require("./attendanceCalculation.service");
const attendanceDateUtils = require("../../../utils/helpers/attendanceDateUtils");
const ApiError = require("../../../utils/errors/ApiError");

// In-process lock per employee to guarantee atomic balance deduction and prevent concurrent over-allocation
const employeeLocks = new Map();
async function withEmployeeLock(employeeId, fn) {
  const key = String(employeeId);
  while (employeeLocks.has(key)) {
    await employeeLocks.get(key);
  }
  let resolveLock;
  const lockPromise = new Promise((resolve) => {
    resolveLock = resolve;
  });
  employeeLocks.set(key, lockPromise);
  try {
    return await fn();
  } finally {
    employeeLocks.delete(key);
    resolveLock();
  }
}

class AttendancePermissionService {
  // ─── Authorization Helpers ───────────────────────────────────────────────

  _extractAuthorizedBranchIds(authContext = {}) {
    return (authContext.authorizedBranchIds || [])
      .filter(Boolean).map((b) => (b._id ? b._id.toString() : b.toString()))
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

  // ─── Time and Calculation Helpers ────────────────────────────────────────

  timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return null;
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr.trim());
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  calculateDurationHours(startTime, endTime) {
    const startMin = this.timeToMinutes(startTime);
    const endMin = this.timeToMinutes(endTime);

    if (startMin === null) {
      throw ApiError.badRequest("Invalid startTime format. Must be HH:mm (00:00 - 23:59).");
    }
    if (endMin === null) {
      throw ApiError.badRequest("Invalid endTime format. Must be HH:mm (00:00 - 23:59).");
    }
    if (endMin <= startMin) {
      throw ApiError.badRequest("Invalid permission times: endTime must be strictly after startTime.");
    }

    const durationMinutes = endMin - startMin;
    return Math.round((durationMinutes / 60) * 100) / 100;
  }

  // ─── Monthly Balance Engine ──────────────────────────────────────────────

  /**
   * Calculates monthly allowance, used hours, and remaining hours
   * directly based on active branch Attendance Policy limits.
   */
  async calculateMonthlyBalance(employeeId, year, month, branchPolicy, excludeRequestId = null) {
    const maxAllowance = Number(branchPolicy.maxPermissionHoursPerMonth ?? 4);

    const query = {
      employeeId: this._toIdFilter(employeeId),
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      status: "APPROVED",
    };

    if (excludeRequestId) {
      query._id = { $ne: excludeRequestId };
    }

    const records = await AttendancePermission.find(query).lean();

    let usedHours = 0;
    for (const rec of records) {
      usedHours += Number(rec.durationHours) || 0;
    }

    usedHours = Math.round(usedHours * 100) / 100;
    const remainingHours = Math.max(0, Math.round((maxAllowance - usedHours) * 100) / 100);

    return {
      monthlyAllowanceHours: maxAllowance,
      usedHours,
      reservedHours: 0,
      pendingHours: 0,
      remainingHours,
    };
  }

  // ─── Daily Limits and Overlap Validation ─────────────────────────────────

  async validateDailyLimitsAndOverlaps(
    employeeId,
    permissionDate,
    startTime,
    endTime,
    requestedHours,
    maxDailyLimit,
    excludeRequestId = null
  ) {
    const startMin = this.timeToMinutes(startTime);
    const endMin = this.timeToMinutes(endTime);

    const query = {
      employeeId: this._toIdFilter(employeeId),
      permissionDate,
      status: "APPROVED",
    };

    if (excludeRequestId) {
      query._id = { $ne: excludeRequestId };
    }

    const existingDaily = await AttendancePermission.find(query).lean();

    let totalDailyHours = 0;
    for (const exist of existingDaily) {
      totalDailyHours += Number(exist.durationHours) || 0;

      // Overlap check: (newStart < existEnd && newEnd > existStart)
      const existStartMin = this.timeToMinutes(exist.startTime);
      const existEndMin = this.timeToMinutes(exist.endTime);
      if (startMin < existEndMin && endMin > existStartMin) {
        throw ApiError.badRequest(
          `An existing permission entry (${exist.startTime} - ${exist.endTime}) overlaps with the requested time range (${startTime} - ${endTime}) on ${permissionDate}.`
        );
      }
    }

    totalDailyHours = Math.round(totalDailyHours * 100) / 100;
    if (totalDailyHours + requestedHours > maxDailyLimit) {
      throw ApiError.badRequest(
        `Requested permission duration of ${requestedHours} hours exceeds the daily permission limit of ${maxDailyLimit} hours configured for this branch (already used on ${permissionDate}: ${totalDailyHours} hours).`
      );
    }
  }

  // ─── API: Create Permission (Automatically Allowed & Deducted) ────────────

  async createPermission(data, actorId, authContext = {}) {
    const { employeeId, permissionDate: rawDate, date: altDate, startTime, endTime, reason } = data;
    const permissionDate = (rawDate || altDate || "").trim();

    if (!employeeId) {
      throw ApiError.badRequest("employeeId is required.");
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw ApiError.badRequest("Invalid employee ID format.");
    }
    if (!permissionDate) {
      throw ApiError.badRequest("permissionDate is required (YYYY-MM-DD).");
    }
    if (!startTime || typeof startTime !== "string") {
      throw ApiError.badRequest("startTime is required (HH:mm).");
    }
    if (!endTime || typeof endTime !== "string") {
      throw ApiError.badRequest("endTime is required (HH:mm).");
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      throw ApiError.badRequest("Reason for permission is required.");
    }

    // 1. Strict Date Validation
    const dateVal = attendanceDateUtils.validateStrictDate(permissionDate);
    if (!dateVal.isValid) {
      throw ApiError.badRequest(dateVal.error);
    }
    const { year, month } = dateVal;

    // 2. Fetch Employee & Trusted Branch Scope
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw ApiError.notFound("Employee not found.");
    }
    if (employee.isActive === false || employee.employmentStatus === "INACTIVE" || employee.employmentStatus === "LEFT") {
      throw ApiError.badRequest("Cannot create permission request for an inactive or departed employee.");
    }

    const empBranchId = employee.branchId ? (employee.branchId._id || employee.branchId) : null;
    if (!empBranchId) {
      throw ApiError.badRequest("Employee has no assigned branch. Contact Admin to assign a branch.");
    }

    if (data.branchId) {
      const bStr = (data.branchId._id || data.branchId).toString();
      if (bStr !== empBranchId.toString()) {
        throw ApiError.badRequest(
          `Employee is assigned to branch '${empBranchId}' but request specified branch '${bStr}'.`
        );
      }
    }

    // 3. Manager Branch Authorization
    this._assertBranchAuthorized(empBranchId, authContext);

    // 4. Resolve Active Holiday Calendar & Reject Mandatory Holidays
    const { isHoliday: isMandatoryHoliday, holiday: permHoliday, calendar: permCalendar } =
      await holidayCalendarService.resolveEffectiveCalendar(empBranchId, permissionDate);
    if (isMandatoryHoliday) {
      throw ApiError.badRequest(
        "Attendance cannot be recorded because this is a mandatory holiday.",
        {
          code: "MANDATORY_HOLIDAY",
          branchId: empBranchId.toString(),
          attendanceDate: permissionDate,
          holidayName: permHoliday?.name || "Holiday",
          holidayType: permHoliday?.type || "PUBLIC",
          holidayCalendarId: permCalendar?._id || null,
        }
      );
    }

    // 5. Resolve Active Attendance Policy for Branch
    const policy = await attendancePolicyService.resolveEffectivePolicy(empBranchId);
    if (policy.permissionEnabled === false) {
      throw ApiError.badRequest(
        "Permission requests are disabled for this branch under the active attendance policy.",
        { code: "PERMISSION_DISABLED", branchId: empBranchId.toString() }
      );
    }

    // 5. Calculate Duration & Verify Daily Limit
    const requestedHours = this.calculateDurationHours(startTime, endTime);
    if (data.durationHours !== undefined && data.durationHours !== null) {
      const specifiedDuration = Number(data.durationHours);
      if (isNaN(specifiedDuration) || specifiedDuration <= 0) {
        throw ApiError.badRequest("durationHours must be a positive number.");
      }
      if (Math.abs(specifiedDuration - requestedHours) > 0.01) {
        throw ApiError.badRequest(
          `Permission durationHours (${specifiedDuration}) does not match the time interval between startTime and endTime (${requestedHours} hours).`
        );
      }
    }
    const maxDaily = Number(policy.maxPermissionHoursPerDay ?? 2);
    if (requestedHours > maxDaily) {
      throw ApiError.badRequest(
        `Requested permission duration of ${requestedHours} hours exceeds the maximum daily limit of ${maxDaily} hours configured for this branch.`
      );
    }

    // 6. Concurrency-Safe Automatic Deduction & Allowance Check
    return withEmployeeLock(employeeId, async () => {
      // Overlap and cumulative daily limit check
      await this.validateDailyLimitsAndOverlaps(
        employeeId,
        permissionDate,
        startTime.trim(),
        endTime.trim(),
        requestedHours,
        maxDaily
      );

      // Current balance calculation
      const balance = await this.calculateMonthlyBalance(employeeId, year, month, policy);

      if (balance.remainingHours <= 0) {
        throw ApiError.badRequest(
          "Your monthly permission allowance has been exhausted. No permission hours are remaining.",
          {
            monthlyAllowanceHours: balance.monthlyAllowanceHours,
            usedHours: balance.usedHours,
            remainingHours: 0,
            requestedHours,
          }
        );
      }

      if (requestedHours > balance.remainingHours) {
        throw ApiError.badRequest(
          `Requested permission duration of ${requestedHours} hours exceeds your remaining monthly allowance of ${balance.remainingHours} hours. Only ${balance.remainingHours} hours are available.`,
          {
            monthlyAllowanceHours: balance.monthlyAllowanceHours,
            usedHours: balance.usedHours,
            remainingHours: balance.remainingHours,
            requestedHours,
          }
        );
      }

      // Automatically deduct duration from allowance
      const newUsedHours = Math.round((balance.usedHours + requestedHours) * 100) / 100;
      const newRemainingHours = Math.max(
        0,
        Math.round((balance.monthlyAllowanceHours - newUsedHours) * 100) / 100
      );

      const permission = await AttendancePermission.create({
        employeeId,
        branchId: empBranchId,
        attendancePolicyId: policy._id,
        permissionDate,
        year,
        month,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        durationHours: requestedHours,
        requestedHours,
        reason: reason.trim(),
        status: "APPROVED", // Automatically allowed
        monthlyAllowanceHours: balance.monthlyAllowanceHours,
        usedHours: newUsedHours,
        reservedHours: 0,
        pendingHours: 0,
        remainingHours: newRemainingHours,
        approvedBy: actorId || null,
        approvedAt: new Date(),
        createdBy: actorId || null,
        updatedBy: actorId || null,
      });

      // Synchronize immediately to Daily Attendance if record exists
      await this.syncPermissionsToDailyAttendance(employeeId, permissionDate, actorId, policy);

      return permission;
    });
  }

  /**
   * Aggregates all approved permissions for an employee on a given date and synchronizes
   * them to DailyAttendance, recalculating worked and paid hours.
   */
  async syncPermissionsToDailyAttendance(employeeId, permissionDate, actorId, policyOverride = null) {
    try {
      const dailyRecord = await DailyAttendance.findOne({
        employeeId: this._toIdFilter(employeeId),
        attendanceDate: permissionDate,
      });

      if (!dailyRecord || dailyRecord.isLocked) {
        return;
      }

      // Query all APPROVED permissions for this employee on this date
      const approvedPermissions = await AttendancePermission.find({
        employeeId: this._toIdFilter(employeeId),
        permissionDate,
        status: "APPROVED",
      })
        .sort({ startTime: 1 })
        .lean();

      const policy =
        policyOverride ||
        (dailyRecord.branchId
          ? await attendancePolicyService.resolveEffectivePolicy(dailyRecord.branchId)
          : null);

      if (approvedPermissions.length === 0) {
        dailyRecord.permissions = [];
        dailyRecord.permission = null;
      } else {
        dailyRecord.permissions = approvedPermissions.map((p) => ({
          permissionId: p._id,
          startTime: p.startTime,
          endTime: p.endTime,
          durationHours: Number(p.durationHours) || 0,
          reason: p.reason || "",
        }));

        const totalDuration =
          Math.round(
            approvedPermissions.reduce((acc, p) => acc + (Number(p.durationHours) || 0), 0) * 100
          ) / 100;

        // Maintain backward compatibility for single permission subdocument
        dailyRecord.permission = {
          durationHours: totalDuration,
          startTime: approvedPermissions[0].startTime,
          endTime: approvedPermissions[approvedPermissions.length - 1].endTime,
          reason: approvedPermissions.map((p) => p.reason).filter(Boolean).join("; "),
        };
      }

      if (policy && dailyRecord.checkIn && dailyRecord.checkOut) {
        const calculated = AttendanceCalculationService.calculateAttendance({
          checkIn: dailyRecord.checkIn,
          checkOut: dailyRecord.checkOut,
          permissions: dailyRecord.permissions,
          permission: dailyRecord.permission,
          overtimeHours: dailyRecord.overtimeHours,
          status: dailyRecord.status,
          policy,
        });

        dailyRecord.workingHoursPerDay = calculated.workingHoursPerDay;
        dailyRecord.paidWorkingHours = calculated.paidWorkingHours;
        dailyRecord.overtimeHours = calculated.overtimeHours;
        dailyRecord.status = calculated.status;
        dailyRecord.lateArrival = calculated.lateArrival;
        dailyRecord.lateMinutes = calculated.lateMinutes;
        dailyRecord.earlyCheckout = calculated.earlyCheckout;
        dailyRecord.earlyCheckoutMinutes = calculated.earlyCheckoutMinutes;
        dailyRecord.calculationStatus = calculated.calculationStatus;
        dailyRecord.calculatedAt = new Date();
      }

      dailyRecord.updatedBy = actorId || null;
      await dailyRecord.save();
    } catch (attErr) {
      console.error("[PermissionService] Warning: Failed to sync permissions to daily attendance:", attErr);
    }
  }

  // ─── API: List Permissions ───────────────────────────────────────────────

  async getPermissions(filters = {}, pagination = {}, authContext = {}) {
    const query = {};

    if (this._isSuperAdmin(authContext)) {
      if (filters.branchId) {
        if (!mongoose.Types.ObjectId.isValid(filters.branchId)) {
          throw ApiError.badRequest("Invalid branch ID format.");
        }
        query.branchId = this._toIdFilter(filters.branchId);
      }
    } else {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      if (authorizedBranchIds.length === 0) {
        throw ApiError.forbidden("Access denied: You have no authorized branch assignments.");
      }
      if (filters.branchId) {
        this._assertBranchAuthorized(filters.branchId, authContext);
        query.branchId = this._toIdFilter(filters.branchId);
      } else {
        query.branchId = this._toIdFilter(authorizedBranchIds);
      }
    }

    if (filters.employeeId) {
      if (!mongoose.Types.ObjectId.isValid(filters.employeeId)) {
        throw ApiError.badRequest("Invalid employee ID format.");
      }
      const targetEmp = await Employee.findById(filters.employeeId).lean();
      if (!targetEmp) {
        throw ApiError.notFound("Employee not found.");
      }
      if (!this._isSuperAdmin(authContext)) {
        const empBranch = targetEmp.branchId ? (targetEmp.branchId._id || targetEmp.branchId) : null;
        this._assertBranchAuthorized(empBranch, authContext);
      }
      query.employeeId = this._toIdFilter(filters.employeeId);
    }

    if (filters.status) {
      query.status = filters.status.toUpperCase().trim();
    } else {
      query.status = { $ne: "CANCELLED" };
    }

    if (filters.permissionDate || filters.date) {
      const d = (filters.permissionDate || filters.date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        throw ApiError.badRequest("Date filter must be in YYYY-MM-DD format.");
      }
      query.permissionDate = d;
    } else if (filters.startDate || filters.endDate) {
      query.permissionDate = {};
      if (filters.startDate) query.permissionDate.$gte = filters.startDate.trim();
      if (filters.endDate) query.permissionDate.$lte = filters.endDate.trim();
    }

    if (filters.year) {
      query.year = parseInt(filters.year, 10);
    }
    if (filters.month) {
      query.month = parseInt(filters.month, 10);
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(pagination.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [permissions, total] = await Promise.all([
      AttendancePermission.find(query)
        .populate({ path: "employeeId", model: "Employee", select: "name employeeCode email mobile" })
        .populate({ path: "branchId", model: "Branch", select: "name code location" })
        .populate({ path: "attendancePolicyId", model: "AttendancePolicy", select: "name code maxPermissionHoursPerDay maxPermissionHoursPerMonth" })
        .populate({ path: "createdBy", model: "User", select: "name email" })
        .populate({ path: "updatedBy", model: "User", select: "name email" })
        .sort({ permissionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AttendancePermission.countDocuments(query),
    ]);

    return {
      permissions,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    };
  }

  // ─── API: Get Single Permission by ID ────────────────────────────────────

  async getPermissionById(id, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid permission ID format.");
    }

    const permission = await AttendancePermission.findById(id)
      .populate({ path: "employeeId", model: "Employee", select: "name employeeCode email mobile" })
      .populate({ path: "branchId", model: "Branch", select: "name code location" })
      .populate({ path: "attendancePolicyId", model: "AttendancePolicy", select: "name code maxPermissionHoursPerDay maxPermissionHoursPerMonth" })
      .populate({ path: "createdBy", model: "User", select: "name email" })
      .populate({ path: "updatedBy", model: "User", select: "name email" })
      .lean();

    if (!permission) {
      throw ApiError.notFound("Permission entry not found.");
    }

    this._assertBranchAuthorized(permission.branchId, authContext);

    try {
      const policy = await attendancePolicyService.resolveEffectivePolicy(permission.branchId);
      const liveBalance = await this.calculateMonthlyBalance(
        permission.employeeId._id || permission.employeeId,
        permission.year,
        permission.month,
        policy
      );
      permission.currentMonthlyBalance = liveBalance;
    } catch {
      // Leave static snapshot if unresolvable
    }

    return permission;
  }

  // ─── API: Update Permission (PUT /:id) ────────────────────────────────────

  async updatePermission(id, data, actorId, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid permission ID format.");
    }

    const permission = await AttendancePermission.findById(id);
    if (!permission) {
      throw ApiError.notFound("Permission entry not found.");
    }

    this._assertBranchAuthorized(permission.branchId, authContext);

    if (permission.status === "CANCELLED") {
      throw ApiError.badRequest("Cannot update a cancelled permission entry.");
    }

    const employeeId = permission.employeeId;
    return withEmployeeLock(employeeId, async () => {
      const branchId = permission.branchId;
      const policy = await attendancePolicyService.resolveEffectivePolicy(branchId);
      if (policy.permissionEnabled === false) {
        throw ApiError.badRequest("Permission is disabled for this branch under the active attendance policy.");
      }

      const effectiveDate = (data.permissionDate || data.date || permission.permissionDate).trim();
      const effectiveStartTime = (data.startTime || permission.startTime).trim();
      const effectiveEndTime = (data.endTime || permission.endTime).trim();
      const effectiveReason = data.reason !== undefined ? data.reason.trim() : permission.reason;

      const dateVal = attendanceDateUtils.validateStrictDate(effectiveDate);
      if (!dateVal.isValid) {
        throw ApiError.badRequest(dateVal.error);
      }
      const { year, month } = dateVal;

      // Reject if date is a mandatory holiday for branch
      const { isHoliday: isMandatoryHoliday, holiday: permHoliday, calendar: permCalendar } =
        await holidayCalendarService.resolveEffectiveCalendar(branchId, effectiveDate);
      if (isMandatoryHoliday) {
        throw ApiError.badRequest(
          "Attendance cannot be recorded because this is a mandatory holiday.",
          {
            code: "MANDATORY_HOLIDAY",
            branchId: branchId.toString(),
            attendanceDate: effectiveDate,
            holidayName: permHoliday?.name || "Holiday",
            holidayType: permHoliday?.type || "PUBLIC",
            holidayCalendarId: permCalendar?._id || null,
          }
        );
      }

      const requestedHours = this.calculateDurationHours(effectiveStartTime, effectiveEndTime);
      if (data.durationHours !== undefined && data.durationHours !== null) {
        const specifiedDuration = Number(data.durationHours);
        if (isNaN(specifiedDuration) || specifiedDuration <= 0) {
          throw ApiError.badRequest("durationHours must be a positive number.");
        }
        if (Math.abs(specifiedDuration - requestedHours) > 0.01) {
          throw ApiError.badRequest(
            `Permission durationHours (${specifiedDuration}) does not match the time interval between startTime and endTime (${requestedHours} hours).`
          );
        }
      }
      const maxDaily = Number(policy.maxPermissionHoursPerDay ?? 2);
      if (requestedHours > maxDaily) {
        throw ApiError.badRequest(
          `Requested permission duration of ${requestedHours} hours exceeds the daily permission limit of ${maxDaily} hours.`
        );
      }

      // Check daily overlaps and cumulative daily hours excluding current request
      await this.validateDailyLimitsAndOverlaps(
        employeeId,
        effectiveDate,
        effectiveStartTime,
        effectiveEndTime,
        requestedHours,
        maxDaily,
        permission._id
      );

      // Check monthly balance excluding current request
      const balance = await this.calculateMonthlyBalance(employeeId, year, month, policy, permission._id);

      if (balance.remainingHours <= 0) {
        throw ApiError.badRequest(
          "Your monthly permission allowance has been exhausted. No permission hours are remaining.",
          {
            monthlyAllowanceHours: balance.monthlyAllowanceHours,
            usedHours: balance.usedHours,
            remainingHours: 0,
            requestedHours,
          }
        );
      }

      if (requestedHours > balance.remainingHours) {
        throw ApiError.badRequest(
          `Requested permission duration of ${requestedHours} hours exceeds your remaining monthly allowance of ${balance.remainingHours} hours. Only ${balance.remainingHours} hours are available.`,
          {
            monthlyAllowanceHours: balance.monthlyAllowanceHours,
            usedHours: balance.usedHours,
            remainingHours: balance.remainingHours,
            requestedHours,
          }
        );
      }

      const beforeState = permission.toObject();
      const newUsedHours = Math.round((balance.usedHours + requestedHours) * 100) / 100;
      const newRemainingHours = Math.max(
        0,
        Math.round((balance.monthlyAllowanceHours - newUsedHours) * 100) / 100
      );

      const previousDate = permission.permissionDate;
      permission.permissionDate = effectiveDate;
      permission.year = year;
      permission.month = month;
      permission.startTime = effectiveStartTime;
      permission.endTime = effectiveEndTime;
      permission.durationHours = requestedHours;
      permission.requestedHours = requestedHours;
      permission.reason = effectiveReason;
      permission.monthlyAllowanceHours = balance.monthlyAllowanceHours;
      permission.usedHours = newUsedHours;
      permission.remainingHours = newRemainingHours;
      permission.updatedBy = actorId || null;

      await permission.save();

      // Sync to Daily Attendance for current date and previous date if date changed
      await this.syncPermissionsToDailyAttendance(employeeId, effectiveDate, actorId, policy);
      if (previousDate && previousDate !== effectiveDate) {
        await this.syncPermissionsToDailyAttendance(employeeId, previousDate, actorId, policy);
      }

      return permission;
    });
  }

  // ─── API: Delete / Cancel Permission (DELETE /:id) ───────────────────────

  async deletePermission(id, actorId, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid permission ID format.");
    }

    const permission = await AttendancePermission.findById(id);
    if (!permission) {
      throw ApiError.notFound("Permission entry not found.");
    }

    this._assertBranchAuthorized(permission.branchId, authContext);

    if (permission.status === "CANCELLED") {
      throw ApiError.badRequest("Permission entry is already cancelled or deleted.");
    }

    const employeeId = permission.employeeId;
    return withEmployeeLock(employeeId, async () => {
      const beforeState = permission.toObject();
      const policy = await attendancePolicyService.resolveEffectivePolicy(permission.branchId);

      // Mark cancelled to preserve audit history and restore allowance
      permission.status = "CANCELLED";
      permission.cancelledBy = actorId || null;
      permission.cancelledAt = new Date();
      permission.updatedBy = actorId || null;

      // Recalculate balance with this permission removed
      const balance = await this.calculateMonthlyBalance(
        employeeId,
        permission.year,
        permission.month,
        policy,
        permission._id
      );

      permission.monthlyAllowanceHours = balance.monthlyAllowanceHours;
      permission.usedHours = balance.usedHours;
      permission.remainingHours = balance.remainingHours;

      await permission.save();

      // Synchronize daily attendance permissions with remaining approved permissions
      await this.syncPermissionsToDailyAttendance(employeeId, permission.permissionDate, actorId, policy);

      return {
        message: "Permission entry deleted successfully and allowance restored.",
        permission,
      };
    });
  }

  // ─── API: Get Employee Monthly Balance ───────────────────────────────────

  async getEmployeeBalance(employeeId, year, month, authContext = {}) {
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      throw ApiError.badRequest("Invalid employee ID format.");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw ApiError.notFound("Employee not found.");
    }

    const empBranchId = employee.branchId ? (employee.branchId._id || employee.branchId) : null;
    if (!empBranchId) {
      throw ApiError.badRequest("Employee has no assigned branch.");
    }

    this._assertBranchAuthorized(empBranchId, authContext);

    const policy = await attendancePolicyService.resolveEffectivePolicy(empBranchId);

    const curYear = parseInt(year, 10) || new Date().getFullYear();
    const curMonth = parseInt(month, 10) || new Date().getMonth() + 1;

    const balance = await this.calculateMonthlyBalance(employeeId, curYear, curMonth, policy);

    return {
      employeeId,
      branchId: empBranchId,
      year: curYear,
      month: curMonth,
      permissionEnabled: policy.permissionEnabled,
      maxPermissionHoursPerDay: policy.maxPermissionHoursPerDay,
      ...balance,
    };
  }
}

module.exports = new AttendancePermissionService();
