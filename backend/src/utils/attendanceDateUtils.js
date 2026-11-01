/**
 * Attendance Date & Calendar Utility
 *
 * Implements centralized date calculations for the PrintZ Attendance Module:
 * - Dynamic calendar days calculation with automatic leap-year handling
 * - Expected monthly working days: calendarDaysInMonth - monthlyLeaveAllowance
 * - Month date ranges and normalization
 */

/**
 * Returns the exact number of calendar days in a given month and year.
 * Correctly accounts for leap years in February (29 days vs 28 days).
 *
 * @param {number|string} year - e.g. 2026 or 2028
 * @param {number|string} month - 1-12 (e.g. 1 for January, 2 for February)
 * @returns {number} Number of days in the month
 */
function getCalendarDaysInMonth(year, month) {
  let y = parseInt(year, 10);
  let m = parseInt(month, 10);

  // Support flexible argument order (month, year) if passed e.g. (1, 2026)
  if (y >= 1 && y <= 12 && m > 31) {
    const temp = y;
    y = m;
    m = temp;
  }

  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    throw new Error(`Invalid year (${year}) or month (${month}) provided.`);
  }

  // Date.UTC with day=0 returns the last day of the previous month.
  // Passing m (1-indexed month) targets the 0th day of the NEXT 0-indexed month,
  // which is exactly the last day of month `m`.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Calculates dynamic monthly expected working days.
 *
 * Formula:
 * expectedWorkingDays = calendarDaysInMonth - monthlyLeaveAllowance
 *
 * Reference examples:
 * - 31 calendar days -> 27 expected working days (Jan, Mar, May, Jul, Aug, Oct, Dec)
 * - 30 calendar days -> 26 expected working days (Apr, Jun, Sep, Nov)
 * - 29 calendar days -> 25 expected working days (Feb in leap years, e.g. 2028)
 * - 28 calendar days -> 24 expected working days (Feb in common years, e.g. 2026)
 *
 * @param {number|string} year
 * @param {number|string} month
 * @param {number} [monthlyLeaveAllowance=4]
 * @returns {number}
 */
function calculateExpectedWorkingDays(year, month, monthlyLeaveAllowance = 4) {
  let y = parseInt(year, 10);
  let m = parseInt(month, 10);
  if (y >= 1 && y <= 12 && m > 31) {
    const temp = y;
    y = m;
    m = temp;
  }
  const calendarDays = getCalendarDaysInMonth(y, m);
  const allowance = Number.isFinite(Number(monthlyLeaveAllowance))
    ? Number(monthlyLeaveAllowance)
    : 4;

  return Math.max(0, calendarDays - allowance);
}

/**
 * Returns start and end date strings (YYYY-MM-DD) for a full calendar month.
 *
 * @param {number|string} year
 * @param {number|string} month
 * @returns {{ startDate: string, endDate: string, calendarDays: number }}
 */
function getMonthDateRange(year, month) {
  let y = parseInt(year, 10);
  let m = parseInt(month, 10);
  if (y >= 1 && y <= 12 && m > 31) {
    const temp = y;
    y = m;
    m = temp;
  }
  const calendarDays = getCalendarDaysInMonth(y, m);
  const mStr = String(m).padStart(2, "0");
  const lastDayStr = String(calendarDays).padStart(2, "0");

  return {
    startDate: `${y}-${mStr}-01`,
    endDate: `${y}-${mStr}-${lastDayStr}`,
    calendarDays,
  };
}

/**
 * Safely parses and validates year and month inputs.
 *
 * @param {number|string} [month] - 1-12 or "01"-"12"
 * @param {number|string} [year] - e.g. 2026
 * @returns {{ month: number, year: number }|null}
 */
function parseMonthYear(month, year) {
  if (month === undefined || month === null || year === undefined || year === null) {
    return null;
  }

  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000 || y > 2100) {
    return null;
  }

  return { month: m, year: y };
}

/**
 * Returns the configured business timezone.
 * Defaults to Asia/Kolkata (IST, UTC+05:30).
 * @returns {string}
 */
function getConfiguredTimezone() {
  return process.env.TIMEZONE || "Asia/Kolkata";
}

/**
 * Returns the current date in the configured business timezone as YYYY-MM-DD.
 * @returns {string}
 */
function getCurrentDateInConfiguredTimezone() {
  const timeZone = getConfiguredTimezone();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Returns the current date in Indian Standard Time (IST, UTC+05:30) as YYYY-MM-DD.
 * @returns {string}
 */
function getCurrentDateIST() {
  return getCurrentDateInConfiguredTimezone();
}

/**
 * Returns the current time in Indian Standard Time (IST, UTC+05:30) as HH:mm (24-hour).
 * @returns {string}
 */
function getCurrentTimeIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  const hours = String(istDate.getHours()).padStart(2, "0");
  const minutes = String(istDate.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Checks if a given year is a leap year.
 * A year is a leap year if it is divisible by 4 but not by 100, or if it is divisible by 400.
 *
 * @param {number|string} year
 * @returns {boolean}
 */
function isLeapYear(year) {
  const y = parseInt(year, 10);
  if (isNaN(y)) return false;
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Validates whether a date string is strictly formatted as YYYY-MM-DD,
 * represents a valid calendar day (taking month limits and leap years into account),
 * optionally verifies that the date's year matches the expected calendar year,
 * and optionally rejects past dates relative to today's date in the configured timezone.
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {number|string} [expectedYear] - Optional expected calendar year
 * @param {boolean|object} [options] - Options or boolean flag for rejectPast
 * @param {boolean} [options.rejectPast=false] - If true, rejects dates earlier than today
 * @param {string} [options.today] - Optional override for today's date (YYYY-MM-DD)
 * @returns {{ isValid: boolean, error?: string, year?: number, month?: number, day?: number }}
 */
function validateStrictDate(dateStr, expectedYear = null, options = {}) {
  const opts = typeof options === "boolean" ? { rejectPast: options } : (options || {});
  const { rejectPast = false, today = getCurrentDateInConfiguredTimezone() } = opts;

  if (typeof dateStr !== "string") {
    return { isValid: false, error: "Date must be a string in YYYY-MM-DD format." };
  }

  const trimmed = dateStr.trim();
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(trimmed)) {
    return { isValid: false, error: `Invalid date format '${dateStr}'. Date format must be strictly YYYY-MM-DD.` };
  }

  const parts = trimmed.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (month < 1 || month > 12) {
    return { isValid: false, error: `Invalid month '${parts[1]}' in date '${dateStr}'. Month must be between 01 and 12.` };
  }

  const maxDays = getCalendarDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    if (month === 2) {
      if (isLeapYear(year)) {
        return {
          isValid: false,
          error: `Invalid date '${dateStr}'. February in leap year ${year} has only 29 days (received day ${parts[2]}).`,
        };
      } else {
        return {
          isValid: false,
          error: `Invalid date '${dateStr}'. Year ${year} is not a leap year; February has only 28 days (received day ${parts[2]}).`,
        };
      }
    }
    return {
      isValid: false,
      error: `Invalid date '${dateStr}'. Month ${parts[1]} has ${maxDays} days (received day ${parts[2]}).`,
    };
  }

  if (expectedYear !== null && expectedYear !== undefined) {
    const numExpectedYear = parseInt(expectedYear, 10);
    if (!isNaN(numExpectedYear) && year !== numExpectedYear) {
      return {
        isValid: false,
        error: `Holiday date '${dateStr}' does not match calendar year ${numExpectedYear}. Each holiday's year must match the selected calendar year.`,
      };
    }
  }

  if (rejectPast) {
    const todayStr = String(today || getCurrentDateInConfiguredTimezone()).trim();
    if (trimmed < todayStr) {
      return {
        isValid: false,
        error: `Holiday date '${dateStr}' is in the past. Only current and future dates (from ${todayStr} onward) are permitted.`,
      };
    }
  }

  return { isValid: true, year, month, day };
}

module.exports = {
  getCalendarDaysInMonth,
  calculateExpectedWorkingDays,
  getMonthDateRange,
  parseMonthYear,
  getConfiguredTimezone,
  getCurrentDateInConfiguredTimezone,
  getCurrentDateIST,
  getCurrentTimeIST,
  isLeapYear,
  validateStrictDate,
};
