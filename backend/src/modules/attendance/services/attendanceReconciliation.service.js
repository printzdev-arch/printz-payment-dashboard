const mongoose = require("mongoose");
const DailyAttendance = require("../models/DailyAttendance");
const Employee = require("../../employees/models/Employee");
const Branch = require("../../branches/models/Branch");
const Role = require("../../auth/models/Role");
const attendancePolicyService = require("./attendancePolicy.service");
const holidayCalendarService = require("./holidayCalendar.service");
const dailyAttendanceService = require("./dailyAttendance.service");
const attendanceEmployeeSyncHelper = require("./attendanceEmployeeSync.helper");
const employeeShiftService = require("../../employee-shift/services/employeeShift.service");
const attendanceDateUtils = require("../../../utils/helpers/attendanceDateUtils");
const AuditHelper = require("../../audit-logs/services/AuditHelper");
const ApiError = require("../../../utils/errors/ApiError");

class AttendanceReconciliationService {
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
      throw ApiError.forbidden("Access denied: Branch assignment missing.");
    }
    const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
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

  _getDayOfWeek(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  /**
   * Get eligible employees for a given branch and date, with existing attendance attached if any
   */
  async getEmployeesForDate({ branchId, attendanceDate } = {}, authContext = {}) {
    if (!branchId || !attendanceDate) {
      throw ApiError.badRequest("branchId and attendanceDate (YYYY-MM-DD) are required.");
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
      throw ApiError.badRequest("attendanceDate must be in YYYY-MM-DD format.");
    }

    this._assertBranchAuthorized(branchId, authContext);

    // 1. Resolve Day Context (Policy, Holiday, Weekly Off)
    const effectivePolicy = await attendancePolicyService.resolveEffectivePolicy(branchId);
    const { isHoliday, holiday } = await holidayCalendarService.resolveEffectiveCalendar(
      branchId,
      attendanceDate
    );
    const dayOfWeek = this._getDayOfWeek(attendanceDate);
    const weeklyOffDays = Array.isArray(effectivePolicy.weeklyOffDays) ? effectivePolicy.weeklyOffDays : [];
    const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

    let dayType = "WORKDAY";
    if (isHoliday) dayType = "HOLIDAY";
    else if (isWeeklyOff) dayType = "WEEKLY_OFF";

    // 2. Make sure designers, operators and delivery members who can sign in are on the employee roster
    await attendanceEmployeeSyncHelper.ensureBranchMembersAsEmployees(branchId);

    // 3. Every active employee assigned to this branch is on the attendance sheet
    const empQuery = {
      branchId: this._toIdFilter(branchId),
      isActive: true,
      employmentStatus: "ACTIVE",
    };

    // Only employees who joined on or before attendanceDate (or no joiningDate recorded)
    const attendanceDateEnd = new Date(attendanceDate);
    attendanceDateEnd.setHours(23, 59, 59, 999);
    empQuery.$or = [
      { joiningDate: { $lte: attendanceDateEnd } },
      { joiningDate: null },
      { joiningDate: { $exists: false } },
    ];

    const homeEmployees = await Employee.find(empQuery)
      .populate("roleId", "name code")
      .sort({ name: 1 })
      .lean();

    // Temporary branch shifts: an employee shifted out of this branch is not on its
    // roster for the shift dates, and one shifted in is added (marked as shifted).
    const { shiftedIn, shiftedOut } = await employeeShiftService.getShiftsForBranchAndDate(
      branchId,
      attendanceDate
    );
    const shiftedOutIds = new Set(
      shiftedOut.map((s) => String(s.employeeId?._id || s.employeeId))
    );
    const shiftInfoByEmployee = new Map();
    const shiftedInEmployees = [];
    for (const s of shiftedIn) {
      const emp = s.employeeId;
      if (!emp || typeof emp !== "object" || !emp._id) continue;
      if (!emp.isActive || emp.employmentStatus !== "ACTIVE") continue;
      const empIdStr = String(emp._id);
      if (shiftInfoByEmployee.has(empIdStr)) continue;
      shiftInfoByEmployee.set(empIdStr, {
        homeBranch: s.sourceBranchId
          ? { _id: s.sourceBranchId._id || s.sourceBranchId, name: s.sourceBranchId.name, code: s.sourceBranchId.code }
          : null,
        shiftInfo: {
          shiftId: s._id,
          fromDate: new Date(s.fromDate).toISOString().slice(0, 10),
          toDate: new Date(s.toDate).toISOString().slice(0, 10),
          remarks: s.remarks || "",
        },
      });
      shiftedInEmployees.push(emp);
    }

    const employees = [
      ...homeEmployees.filter((e) => !shiftedOutIds.has(String(e._id))),
      ...shiftedInEmployees.filter(
        (e, i, arr) => arr.findIndex((x) => String(x._id) === String(e._id)) === i
      ),
    ].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    // 3. Fetch existing attendance records for this branch and date
    const attendanceRecords = await DailyAttendance.find({
      branchId: this._toIdFilter(branchId),
      attendanceDate,
    }).lean();

    const recordMap = new Map();
    for (const r of attendanceRecords) {
      const empIdStr = (r.employeeId._id || r.employeeId).toString();
      recordMap.set(empIdStr, r);
    }

    // Merge employee with attendance
    const results = employees.map((emp) => {
      const empIdStr = emp._id.toString();
      const attendance = recordMap.get(empIdStr) || null;
      const shifted = shiftInfoByEmployee.get(empIdStr);
      return {
        employee: emp,
        isShifted: Boolean(shifted),
        homeBranch: shifted ? shifted.homeBranch : null,
        shiftInfo: shifted ? shifted.shiftInfo : null,
        attendance: attendance ? dailyAttendanceService.serializeDailyAttendance(attendance) : null,
        hasAttendance: Boolean(attendance),
        suggestedStatus: attendance ? attendance.status : (isHoliday ? "HOLIDAY" : (isWeeklyOff ? "WEEKLY_OFF" : "PRESENT")),
      };
    });

    return {
      branchId,
      attendanceDate,
      dayType,
      isHoliday,
      holidayName: holiday ? holiday.name : null,
      isWeeklyOff,
      entryAllowed: !isHoliday,
      attendanceBlockedReason: isHoliday ? `Holiday: ${holiday?.name || "Branch holiday"}. Attendance entry is disabled.` : null,
      totalEmployees: employees.length,
      recordedCount: attendanceRecords.length,
      shiftedInCount: shiftedInEmployees.length,
      shiftedOutCount: shiftedOutIds.size,
      // Holidays are not missing-attendance days and must not be reconciled as absent.
      missingCount: isHoliday ? 0 : results.filter((r) => !r.hasAttendance).length,
      items: results,
    };
  }

  /**
   * Identify employees with missing attendance for a selected branch and date
   * Does NOT create records automatically!
   */
  async getMissingAttendance({ branchId, attendanceDate } = {}, authContext = {}) {
    const data = await this.getEmployeesForDate({ branchId, attendanceDate }, authContext);

    const missingEmployees = (data.isHoliday ? [] : data.items)
      .filter((item) => !item.hasAttendance)
      .map((item) => ({
        _id: item.employee._id,
        employeeCode: item.employee.employeeCode,
        name: item.employee.name,
        email: item.employee.email,
        mobile: item.employee.mobile,
        suggestedStatus: item.suggestedStatus,
      }));

    return {
      branchId: data.branchId,
      attendanceDate: data.attendanceDate,
      dayType: data.dayType,
      isHoliday: data.isHoliday,
      holidayName: data.holidayName,
      isWeeklyOff: data.isWeeklyOff,
      entryAllowed: data.entryAllowed,
      attendanceBlockedReason: data.attendanceBlockedReason,
      totalEligible: data.totalEmployees,
      totalRecorded: data.recordedCount,
      missingCount: missingEmployees.length,
      missingEmployees,
    };
  }

  /**
   * Reconcile missing attendance by submitting manual records or auto-marking missing employees
   */
  async reconcileAttendance(payload, actorId, authContext = {}) {
    const { branchId, attendanceDate, records = [], autoFillAbsent = false, remarks = "Reconciled by manager" } = payload;

    if (!branchId || !attendanceDate) {
      throw ApiError.badRequest("branchId and attendanceDate (YYYY-MM-DD) are required.");
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
      throw ApiError.badRequest("attendanceDate must be in YYYY-MM-DD format.");
    }

    this._assertBranchAuthorized(branchId, authContext);
    if (!this._isSuperAdmin(authContext)) {
      const role = (authContext.role || "").toUpperCase();
      if (["MANAGER", "BRANCH_MANAGER", "EMPLOYEE", "STAFF"].includes(role)) {
        throw ApiError.forbidden("Access denied: Reconciling attendance is restricted to Admin or HR Admin. Branch Managers cannot reconcile attendance.");
      }
    }
    await attendancePolicyService.resolveEffectivePolicy(branchId);

    const dayCalendar = await holidayCalendarService.resolveEffectiveCalendar(branchId, attendanceDate);
    if (dayCalendar.isHoliday) {
      throw ApiError.badRequest(
        "Attendance cannot be recorded because this is a mandatory holiday.",
        {
          code: "MANDATORY_HOLIDAY",
          branchId: String(branchId?._id || branchId),
          attendanceDate,
          holidayName: dayCalendar.holiday?.name || "Holiday",
          holidayType: dayCalendar.holiday?.type || "PUBLIC",
          holidayCalendarId: dayCalendar.calendar?._id || null,
        }
      );
    }

    const todayStr = attendanceDateUtils.getCurrentDateIST();
    if (autoFillAbsent && attendanceDate >= todayStr) {
      throw ApiError.badRequest(
        `Cannot auto-fill ABSENT for current or future date (${attendanceDate}). Absence can only be assigned after the relevant workday has ended.`
      );
    }

    // 1. Fetch missing employees
    const missingData = await this.getMissingAttendance({ branchId, attendanceDate }, authContext);
    const missingEmpIds = new Set(missingData.missingEmployees.map((e) => e._id.toString()));

    const results = {
      totalSubmitted: records.length,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdRecords: [],
      skipped: [],
      errors: [],
    };

    // 2. Process explicit submitted records
    for (const rec of records) {
      try {
        if (!rec.employeeId) {
          results.failedCount++;
          results.errors.push({ employeeId: null, message: "Missing employeeId in record" });
          continue;
        }

        const empIdStr = (rec.employeeId._id || rec.employeeId).toString();
        if (!mongoose.Types.ObjectId.isValid(empIdStr)) {
          results.failedCount++;
          results.errors.push({ employeeId: empIdStr, message: "Invalid employee ID format." });
          continue;
        }

        if (rec.status === "ABSENT" && attendanceDate >= todayStr) {
          results.failedCount++;
          results.errors.push({
            employeeId: empIdStr,
            message: `Cannot mark ABSENT for current or future date (${attendanceDate}). Absence can only be assigned after the relevant workday has ended.`,
          });
          continue;
        }

        // Check if attendance already exists
        const exists = await DailyAttendance.findOne({
          employeeId: this._toIdFilter(empIdStr),
          branchId: this._toIdFilter(branchId),
          attendanceDate,
        });

        if (exists) {
          results.skippedCount++;
          results.skipped.push({
            employeeId: empIdStr,
            reason: "Record already exists for this date",
          });
          missingEmpIds.delete(empIdStr);
          continue;
        }

        const created = await dailyAttendanceService.createAttendance(
          {
            employeeId: empIdStr,
            branchId,
            attendanceDate,
            checkIn: rec.checkIn || null,
            checkOut: rec.checkOut || null,
            status: rec.status || (missingData.isHoliday ? "HOLIDAY" : (missingData.isWeeklyOff ? "WEEKLY_OFF" : "PRESENT")),
            permission: rec.permission || null,
            leavePaymentType: rec.leavePaymentType || null,
            remarks: rec.remarks || remarks,
            source: "MANUAL",
          },
          actorId,
          authContext
        );

        results.createdCount++;
        results.createdRecords.push(created);
        missingEmpIds.delete(empIdStr);
      } catch (err) {
        results.failedCount++;
        results.errors.push({
          employeeId: rec.employeeId,
          message: err.message || "Failed to process record",
        });
      }
    }

    // 3. Auto-fill remaining missing employees as ABSENT (or HOLIDAY / WEEKLY_OFF) if requested
    if (autoFillAbsent && missingEmpIds.size > 0) {
      const defaultStatus = missingData.isHoliday
        ? "HOLIDAY"
        : (missingData.isWeeklyOff ? "WEEKLY_OFF" : "ABSENT");

      for (const empId of missingEmpIds) {
        try {
          const created = await dailyAttendanceService.createAttendance(
            {
              employeeId: empId,
              branchId,
              attendanceDate,
              status: defaultStatus,
              remarks: `${remarks} (Auto-filled ${defaultStatus})`,
              source: "SYSTEM",
            },
            actorId,
            authContext
          );

          results.createdCount++;
          results.createdRecords.push(created);
        } catch (err) {
          results.failedCount++;
          results.errors.push({
            employeeId: empId,
            message: err.message || "Failed to auto-fill record",
          });
        }
      }
    }

    // Audit Log for reconciliation event
    await AuditHelper.log({
      action: "ATTENDANCE_RECONCILE",
      actorId,
      actorRole: authContext.role || null,
      userRole: authContext.role || null,
      entityType: "ATTENDANCE_RECONCILIATION",
      entityId: new mongoose.Types.ObjectId(),
      branchId,
      after: {
        branchId,
        attendanceDate,
        createdCount: results.createdCount,
        skippedCount: results.skippedCount,
        failedCount: results.failedCount,
        autoFillAbsent,
      },
    });

    return results;
  }
}

module.exports = new AttendanceReconciliationService();
