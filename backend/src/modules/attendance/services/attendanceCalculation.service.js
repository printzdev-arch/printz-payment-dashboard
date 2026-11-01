/**
 * AttendanceCalculationService
 *
 * Dedicated, deterministic, reusable calculation engine for employee attendance.
 *
 * Business Rules & Formulas:
 * 1. Timezone: Indian Standard Time (IST, UTC+05:30) / System Local. Date string format: YYYY-MM-DD.
 * 2. Time values format: HH:mm (24-hour).
 * 3. Elapsed Time:
 *    - Standard Day Shift: checkOutMinutes - checkInMinutes
 *    - Overnight Shift (checkOut < checkIn): (1440 - checkInMinutes) + checkOutMinutes
 * 4. Break Deduction:
 *    - If elapsed minutes > policy.breakDurationMinutes:
 *        netWorkingMinutes = elapsedMinutes - policy.breakDurationMinutes
 *      Else:
 *        netWorkingMinutes = elapsedMinutes
 * 5. Working Hours:
 *    - netWorkingHours = Math.round((netWorkingMinutes / 60) * 100) / 100
 *    - If permission.durationHours > 0 is provided:
 *        creditedHours = Math.min(policy.workingHoursPerDay, netWorkingHours + permission.durationHours)
 * 6. Thresholds:
 *    - creditedHours >= policy.fullDayHours -> "PRESENT"
 *    - creditedHours >= policy.halfDayHours -> "HALF_DAY"
 *    - creditedHours < policy.halfDayHours  -> "ABSENT"
 * 7. Late Arrival:
 *    - checkInMinutes > (shiftStartTimeMinutes + policy.lateGraceMinutes)
 * 8. Early Checkout:
 *    - checkOutMinutes < (shiftEndTimeMinutes - policy.earlyCheckoutGraceMinutes)
 * 9. Missing Data:
 *    - Both checkIn & checkOut missing -> 0 hours, ABSENT (or existing manual status)
 *    - checkIn present but checkOut missing -> 0 hours, PENDING calculation status
 * 10. Manual Status Preservation:
 *    - Manual ABSENT, ON_LEAVE, HOLIDAY, WEEKLY_OFF statuses without timestamps are preserved with MANUAL_OVERRIDE.
 */

class AttendanceCalculationService {
  /**
   * Parse "HH:mm" string to integer minutes from 00:00
   * @param {string} timeStr
   * @returns {number|null}
   */
  static timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return null;
    const trimmed = timeStr.trim();
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  /**
   * Convert integer minutes to "HH:mm" string
   * @param {number} totalMinutes
   * @returns {string}
   */
  static minutesToTime(totalMinutes) {
    if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return null;
    const normalized = Math.max(0, Math.floor(totalMinutes)) % 1440;
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  /**
   * Calculate elapsed minutes between checkIn and checkOut, supporting overnight shifts
   * @param {string} checkIn
   * @param {string} checkOut
   * @returns {number}
   */
  static calculateElapsedMinutes(checkIn, checkOut) {
    const inMin = this.timeToMinutes(checkIn);
    const outMin = this.timeToMinutes(checkOut);

    if (inMin === null || outMin === null) return 0;

    if (outMin >= inMin) {
      return outMin - inMin;
    }
    // Overnight shift: crosses midnight
    return (1440 - inMin) + outMin;
  }

  /**
   * Calculate net working hours between checkIn and checkOut with optional break deduction
   * @param {string} checkIn
   * @param {string} checkOut
   * @param {number} [breakDurationMinutes=60]
   * @param {number} [halfDayHours=4]
   * @returns {number}
   */
  static calculateHoursWorked(checkIn, checkOut, breakDurationMinutes = 60, halfDayHours = 4) {
    const elapsedMinutes = this.calculateElapsedMinutes(checkIn, checkOut);
    const breakMinutes = Number(breakDurationMinutes) || 0;
    const halfDayMinutes = Math.round(Number(halfDayHours || 4) * 60);
    let netMinutes = elapsedMinutes;
    if (breakMinutes > 0 && elapsedMinutes > breakMinutes && elapsedMinutes > halfDayMinutes) {
      netMinutes = elapsedMinutes - breakMinutes;
    }
    return Math.round((netMinutes / 60) * 100) / 100;
  }

  /**
   * Check if an employee's check-in qualifies as late arrival
   * @param {string} checkIn
   * @param {string} shiftStartTime
   * @param {number} [lateGraceMinutes=15]
   * @returns {boolean}
   */
  static isLateArrival(checkIn, shiftStartTime, lateGraceMinutes = 15) {
    const inMin = this.timeToMinutes(checkIn);
    const startMin = this.timeToMinutes(shiftStartTime);
    if (inMin === null || startMin === null) return false;
    const grace = Number(lateGraceMinutes) || 0;
    return inMin > (startMin + grace);
  }

  /**
   * Calculate late arrival duration in minutes from shift start time
   * @param {string} checkIn
   * @param {string} shiftStartTime
   * @param {number} [lateGraceMinutes=15]
   * @returns {number} late duration in minutes (0 if on-time / within grace)
   */
  static calculateLateMinutes(checkIn, shiftStartTime, lateGraceMinutes = 15) {
    const inMin = this.timeToMinutes(checkIn);
    const startMin = this.timeToMinutes(shiftStartTime);
    if (inMin === null || startMin === null) return 0;
    const grace = Number(lateGraceMinutes) || 0;
    if (inMin > (startMin + grace)) {
      return Math.max(0, inMin - startMin);
    }
    return 0;
  }

  /**
   * Check if an employee's check-out qualifies as early checkout
   * @param {string} checkOut
   * @param {string} shiftStartTime
   * @param {string} shiftEndTime
   * @param {number} [earlyCheckoutGraceMinutes=0]
   * @returns {boolean}
   */
  static isEarlyCheckout(checkOut, shiftStartTime, shiftEndTime, earlyCheckoutGraceMinutes = 0) {
    const outMin = this.timeToMinutes(checkOut);
    const endMin = this.timeToMinutes(shiftEndTime);
    const startMin = this.timeToMinutes(shiftStartTime);

    if (outMin === null || endMin === null) return false;

    const grace = Number(earlyCheckoutGraceMinutes) || 0;
    const isOvernight = startMin !== null && endMin < startMin;
    if (!isOvernight) {
      return outMin < (endMin - grace);
    } else {
      // Overnight shift (e.g. 22:00 to 06:00):
      // Left before midnight on day 1: early checkout
      if (startMin !== null && outMin >= startMin) {
        return true;
      }
      // Left before end time minus grace on day 2: early checkout
      if (outMin < (endMin - grace)) {
        return true;
      }
      return false;
    }
  }

  /**
   * Calculate early checkout duration in minutes
   * @param {string} checkOut
   * @param {string} shiftStartTime
   * @param {string} shiftEndTime
   * @param {number} [earlyCheckoutGraceMinutes=0]
   * @returns {number} early checkout duration in minutes (0 if departed on or after shift end)
   */
  static calculateEarlyCheckoutMinutes(checkOut, shiftStartTime, shiftEndTime, earlyCheckoutGraceMinutes = 0) {
    const outMin = this.timeToMinutes(checkOut);
    const endMin = this.timeToMinutes(shiftEndTime);
    const startMin = this.timeToMinutes(shiftStartTime);

    if (outMin === null || endMin === null) return 0;

    const grace = Number(earlyCheckoutGraceMinutes) || 0;
    const isOvernight = startMin !== null && endMin < startMin;
    if (!isOvernight) {
      if (outMin < (endMin - grace)) {
        return Math.max(0, endMin - outMin);
      }
      return 0;
    } else {
      if (startMin !== null && outMin >= startMin) {
        return Math.max(0, (1440 - outMin) + endMin);
      }
      if (outMin < (endMin - grace)) {
        return Math.max(0, endMin - outMin);
      }
      return 0;
    }
  }

  /**
   * Execute full calculation on an attendance record against an effective policy
   *
   * @param {Object} params
   * @param {string} [params.checkIn] - "HH:mm"
   * @param {string} [params.checkOut] - "HH:mm"
   * @param {string} [params.status] - "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "HOLIDAY" | "WEEKLY_OFF"
   * @param {Object} [params.permission] - { durationHours, startTime, endTime, reason }
   * @param {number} [params.overtimeHours] - Optional explicit overtime hours
   * @param {Object} policy - Effective AttendancePolicy (plain object or Mongoose doc)
   * @param {boolean} [isHoliday=false] - Whether date is a confirmed holiday
   * @param {boolean} [isWeeklyOff=false] - Whether date is a confirmed weekly off
   * @returns {Object} Calculated metrics
   */
  static calculateAttendance({
    checkIn = null,
    checkOut = null,
    status = null,
    permission = null,
    overtimeHours = null,
    policy = {},
    isHoliday = false,
    isWeeklyOff = false,
  }) {
    // Resolve effective policy values
    const shiftStartTime = policy.shiftStartTime || "09:00";
    const shiftEndTime = policy.shiftEndTime || "18:00";
    const lateGraceMinutes = Number.isFinite(Number(policy.lateGraceMinutes)) ? Number(policy.lateGraceMinutes) : 15;
    const earlyCheckoutGraceMinutes = Number.isFinite(Number(policy.earlyCheckoutGraceMinutes)) ? Number(policy.earlyCheckoutGraceMinutes) : 0;
    const breakDurationMinutes = Number.isFinite(Number(policy.breakDurationMinutes)) ? Number(policy.breakDurationMinutes) : 60;
    const requiredWorkingHours = Number(policy.workingHoursPerDay || 8);
    const halfDayHours = Number(policy.halfDayHours || 4);
    const fullDayHours = Number(policy.fullDayHours || 8);
    const overtimeEnabled = policy.overtimeEnabled !== undefined ? Boolean(policy.overtimeEnabled) : true;

    const hasCheckIn = Boolean(checkIn && this.timeToMinutes(checkIn) !== null);
    const hasCheckOut = Boolean(checkOut && this.timeToMinutes(checkOut) !== null);

    // 1. Manual non-working status override preservation (when no check-in & check-out provided)
    const MANUAL_NON_WORKING = new Set(["ON_LEAVE", "HOLIDAY", "WEEKLY_OFF", "ABSENT"]);
    if (!hasCheckIn && !hasCheckOut) {
      if (status && MANUAL_NON_WORKING.has(status)) {
        return {
          status,
          workingHoursPerDay: 0,
          paidWorkingHours: status === "HOLIDAY" ? requiredWorkingHours : 0,
          overtimeHours: 0,
          overtimeStatus: "NONE",
          lateArrival: false,
          lateMinutes: 0,
          earlyCheckout: false,
          earlyCheckoutMinutes: 0,
          calculationStatus: "MANUAL_OVERRIDE",
          calculatedAt: new Date(),
        };
      }

      // If date is designated as holiday or weekly off and no timestamps given
      if (isHoliday) {
        return {
          status: "HOLIDAY",
          workingHoursPerDay: 0,
          paidWorkingHours: requiredWorkingHours,
          overtimeHours: 0,
          overtimeStatus: "NONE",
          lateArrival: false,
          lateMinutes: 0,
          earlyCheckout: false,
          earlyCheckoutMinutes: 0,
          calculationStatus: "CALCULATED",
          calculatedAt: new Date(),
        };
      }

      if (isWeeklyOff) {
        return {
          status: "WEEKLY_OFF",
          workingHoursPerDay: 0,
          paidWorkingHours: 0,
          overtimeHours: 0,
          overtimeStatus: "NONE",
          lateArrival: false,
          lateMinutes: 0,
          earlyCheckout: false,
          earlyCheckoutMinutes: 0,
          calculationStatus: "CALCULATED",
          calculatedAt: new Date(),
        };
      }

      // Default when no timestamps given on a regular workday
      return {
        status: status || "ABSENT",
        workingHoursPerDay: 0,
        paidWorkingHours: 0,
        overtimeHours: 0,
        overtimeStatus: "NONE",
        lateArrival: false,
        lateMinutes: 0,
        earlyCheckout: false,
        earlyCheckoutMinutes: 0,
        calculationStatus: "CALCULATED",
        calculatedAt: new Date(),
      };
    }

    // 2. Partial attendance: Check-in present but check-out missing (must remain PENDING)
    if (hasCheckIn && !hasCheckOut) {
      const lateArrival = this.isLateArrival(checkIn, shiftStartTime, lateGraceMinutes);
      const lateMinutes = this.calculateLateMinutes(checkIn, shiftStartTime, lateGraceMinutes);
      return {
        status: "PENDING",
        workingHoursPerDay: 0,
        paidWorkingHours: 0,
        overtimeHours: 0,
        overtimeStatus: "NONE",
        lateArrival,
        lateMinutes,
        earlyCheckout: false,
        earlyCheckoutMinutes: 0,
        calculationStatus: "PENDING",
        calculatedAt: new Date(),
      };
    }

    // 3. Partial attendance: Check-out present without check-in (must remain PENDING)
    if (!hasCheckIn && hasCheckOut) {
      const earlyCheckout = this.isEarlyCheckout(checkOut, shiftStartTime, shiftEndTime, earlyCheckoutGraceMinutes);
      const earlyCheckoutMinutes = this.calculateEarlyCheckoutMinutes(checkOut, shiftStartTime, shiftEndTime, earlyCheckoutGraceMinutes);
      return {
        status: "PENDING",
        workingHoursPerDay: 0,
        paidWorkingHours: 0,
        overtimeHours: 0,
        overtimeStatus: "NONE",
        lateArrival: false,
        lateMinutes: 0,
        earlyCheckout,
        earlyCheckoutMinutes,
        calculationStatus: "PENDING",
        calculatedAt: new Date(),
      };
    }

    // 4. Complete attendance: Both checkIn and checkOut present
    const inMin = this.timeToMinutes(checkIn);
    const outMin = this.timeToMinutes(checkOut);
    const startMin = this.timeToMinutes(shiftStartTime);
    const endMin = this.timeToMinutes(shiftEndTime);
    const isOvernight = startMin !== null && endMin !== null && startMin > endMin;

    if (inMin !== null && outMin !== null) {
      if (inMin === outMin) {
        const ApiError = require("../../../utils/ApiError");
        throw ApiError.badRequest("Invalid timestamps: checkIn and checkOut cannot be identical.");
      }
      if (!isOvernight && outMin < inMin) {
        const ApiError = require("../../../utils/ApiError");
        throw ApiError.badRequest("Invalid timestamps: checkOut time must be strictly after checkIn time.");
      }
    }

    const elapsedMinutes = this.calculateElapsedMinutes(checkIn, checkOut);

    // Apply configured break deduction:
    // Only deduct when elapsed time exceeds the break duration and is greater than half-day hours
    // (avoids deducting 60 min lunch break on employees who only worked 2-4 hours).
    let breakDeductionMinutes = 0;
    const halfDayMinutes = Math.round(halfDayHours * 60);
    if (breakDurationMinutes > 0 && elapsedMinutes > breakDurationMinutes) {
      if (elapsedMinutes > halfDayMinutes) {
        breakDeductionMinutes = breakDurationMinutes;
      }
    }

    const netWorkingMinutes = Math.max(0, elapsedMinutes - breakDeductionMinutes);
    const baseHours = Math.round((netWorkingMinutes / 60) * 100) / 100;

    // Add approved permission hours if present (supports single permission or permissions array)
    let permissionHours = 0;
    if (Array.isArray(permission)) {
      permissionHours = permission.reduce((sum, p) => sum + (Number(p?.durationHours) || 0), 0);
    } else if (permission && Number(permission.durationHours)) {
      permissionHours = Number(permission.durationHours) || 0;
    }
    const permissionMinutes = Math.round(permissionHours * 60);

    // Credited hours for attendance status determination (net worked hours + permission)
    const creditedMinutes = netWorkingMinutes + permissionMinutes;
    const creditedHours = Math.round((creditedMinutes / 60) * 100) / 100;

    // Paid working hours: regular hours covered by work + approved permission, capped at requiredWorkingHours
    const requiredWorkingMinutes = Math.round(requiredWorkingHours * 60);
    const paidMinutes = Math.min(requiredWorkingMinutes, creditedMinutes);
    const paidWorkingHours = Math.round((paidMinutes / 60) * 100) / 100;

    // Grace period boundaries applied strictly
    const lateArrival = this.isLateArrival(checkIn, shiftStartTime, lateGraceMinutes);
    const lateMinutes = this.calculateLateMinutes(checkIn, shiftStartTime, lateGraceMinutes);
    const earlyCheckout = this.isEarlyCheckout(checkOut, shiftStartTime, shiftEndTime, earlyCheckoutGraceMinutes);
    const earlyCheckoutMinutes = this.calculateEarlyCheckoutMinutes(checkOut, shiftStartTime, shiftEndTime, earlyCheckoutGraceMinutes);

    // Status evaluation based on threshold rules
    let finalStatus = "ABSENT";
    if (creditedHours >= fullDayHours) {
      finalStatus = "PRESENT";
    } else if (creditedHours >= halfDayHours) {
      finalStatus = "HALF_DAY";
    } else {
      finalStatus = "ABSENT";
    }

    // Preserve manual non-working status if explicitly submitted with punches
    if (isHoliday && status === "HOLIDAY") {
      finalStatus = "HOLIDAY";
    } else if (isWeeklyOff && status === "WEEKLY_OFF") {
      finalStatus = "WEEKLY_OFF";
    }

    // Overtime tracking: strictly based on net worked minutes exceeding daily threshold
    // Permission hours are never treated as overtime
    let calculatedOt = 0;
    if (overtimeEnabled && netWorkingMinutes > requiredWorkingMinutes) {
      const overtimeMinutes = netWorkingMinutes - requiredWorkingMinutes;
      calculatedOt = Math.max(0, Math.round((overtimeMinutes / 60) * 100) / 100);
    }

    return {
      status: finalStatus,
      workingHoursPerDay: baseHours,
      paidWorkingHours,
      overtimeHours: calculatedOt,
      overtimeStatus: "NONE",
      lateArrival,
      lateMinutes,
      earlyCheckout,
      earlyCheckoutMinutes,
      calculationStatus: "CALCULATED",
      calculatedAt: new Date(),
    };
  }

  static evaluateAttendance(params) {
    return this.calculateAttendance(params);
  }
}

module.exports = AttendanceCalculationService;
