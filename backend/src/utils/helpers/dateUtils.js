/**
 * Centralized Date & Time Utility for PrintZ V2 (Backend)
 * Enforces Asia/Kolkata (IST, UTC+05:30) as application display and business timezone.
 */

const APP_TIMEZONE = "Asia/Kolkata";
const APP_LOCALE = "en-IN";

const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Returns today's calendar date in Asia/Kolkata formatted as YYYY-MM-DD.
 * Does not shift into yesterday between 00:00 and 05:30 IST.
 * @param {Date|string|number} [date] - Optional date to format, defaults to now.
 * @returns {string} e.g. "2026-10-16"
 */
function getTodayDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return istDateFormatter.format(new Date());
  return istDateFormatter.format(d);
}

/**
 * Returns today's date prefix formatted as YYYYMMDD in Asia/Kolkata.
 * Used for sequential order numbers (JOB-YYYYMMDD-XXXX, PO-YYYYMMDD-XXXX, etc.).
 * @param {Date|string|number} [date]
 * @returns {string} e.g. "20261016"
 */
function getDatePrefix(date = new Date()) {
  return getTodayDateString(date).replace(/-/g, "");
}

/**
 * Formats a timestamp into human-readable IST Date (e.g., "16 Oct 2026").
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
function formatISTDate(date, options = {}) {
  if (!date) return "-";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

/**
 * Formats a timestamp into human-readable IST Date + Time (e.g., "16 Oct 2026, 01:23 PM").
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
function formatISTDateTime(date, options = {}) {
  if (!date) return "-";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/**
 * Formats a timestamp into human-readable IST Time (e.g., "01:23 PM").
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
function formatISTTime(date, options = {}) {
  if (!date) return "-";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/**
 * Safely parses a business date (YYYY-MM-DD or ISO string) without day shifting.
 * For YYYY-MM-DD, anchors to UTC noon to prevent cross-timezone calendar date changes.
 * @param {string|Date} val
 * @returns {Date|null}
 */
function parseBusinessDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split("-").map(Number);
    // 00:00 IST is 18:30 UTC previous day (UTC - 5h30m)
    // Noon UTC (12:00 UTC) is 17:30 IST on the same day everywhere
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Returns the UTC Date instant corresponding to start of IST day (00:00:00.000 IST).
 * E.g. for 2026-10-16, 00:00 IST is 2026-10-15T18:30:00.000Z.
 * @param {Date|string} [date]
 * @returns {Date}
 */
function startOfISTDay(date = new Date()) {
  const dateStr = getTodayDateString(date);
  const [year, month, day] = dateStr.split("-").map(Number);
  // IST is UTC+5:30. 00:00:00 IST = previous day 18:30:00.000 UTC
  const utcMillis = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - (5.5 * 3600 * 1000);
  return new Date(utcMillis);
}

/**
 * Returns the UTC Date instant corresponding to end of IST day (23:59:59.999 IST).
 * @param {Date|string} [date]
 * @returns {Date}
 */
function endOfISTDay(date = new Date()) {
  const start = startOfISTDay(date);
  return new Date(start.getTime() + (24 * 3600 * 1000) - 1);
}

module.exports = {
  APP_TIMEZONE,
  APP_LOCALE,
  getTodayDateString,
  getDatePrefix,
  formatISTDate,
  formatISTDateTime,
  formatISTTime,
  parseBusinessDate,
  startOfISTDay,
  endOfISTDay,
};
