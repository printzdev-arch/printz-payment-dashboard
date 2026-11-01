const mongoose = require("mongoose");
const HolidayCalendar = require("../models/HolidayCalendar");
const DailyAttendance = require("../models/DailyAttendance");
const Branch = require("../../branches/models/Branch");
const AuditHelper = require("../../audit-logs/helpers/AuditHelper");
const ApiError = require("../../../utils/ApiError");

const { validateStrictDate, getCurrentDateInConfiguredTimezone } = require("../../../utils/attendanceDateUtils");

class HolidayCalendarService {
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
      throw ApiError.forbidden("Access denied: Only Super Admin can manage organization-wide holiday calendars.");
    }

    const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
    if (authorizedBranchIds.length === 0) {
      throw ApiError.forbidden("Access denied: No authorized branch assignments found.");
    }

    const tStr = targetBranchId._id ? targetBranchId._id.toString() : targetBranchId.toString();
    if (!authorizedBranchIds.includes(tStr)) {
      throw ApiError.forbidden("Access denied: You are not authorized for the specified branch.");
    }
  }

  _assertCanManageHolidays(authContext = {}) {
    if (this._isSuperAdmin(authContext)) return;
    const role = (authContext.role || "").toUpperCase();
    if (role === "MANAGER" || role === "BRANCH_MANAGER" || role === "EMPLOYEE") {
      throw ApiError.forbidden("Access denied: Branch Managers cannot create, update, or delete holiday calendars.");
    }
  }

  _validateHolidaysArray(holidays, year, options = {}) {
    if (!Array.isArray(holidays)) return [];
    const dateSet = new Set();
    const sanitized = [];
    const rejectPast = options.rejectPast === true; // Default false for annual holiday calendars (Jan 1 to Dec 31)

    for (let i = 0; i < holidays.length; i++) {
      const h = holidays[i];
      if (!h || typeof h !== "object") {
        throw ApiError.badRequest(`Holiday at index ${i} must be an object with name and date.`);
      }
      if (!h.name || typeof h.name !== "string" || !h.name.trim()) {
        throw ApiError.badRequest(`Holiday at index ${i} requires a non-empty name.`);
      }
      if (!h.date) {
        throw ApiError.badRequest(`Holiday '${h.name.trim()}' requires a valid YYYY-MM-DD date.`);
      }

      const dateStr = String(h.date).trim();
      const validation = validateStrictDate(dateStr, year, { rejectPast, today: options.today });
      if (!validation.isValid) {
        throw ApiError.badRequest(validation.error);
      }

      if (dateSet.has(dateStr)) {
        throw ApiError.badRequest(`Duplicate holiday date '${dateStr}' found in calendar entries.`);
      }
      dateSet.add(dateStr);

      sanitized.push({
        name: String(h.name).trim(),
        date: dateStr,
        type: h.type && ["PUBLIC", "FESTIVAL", "OPTIONAL", "COMPANY"].includes(String(h.type).toUpperCase())
          ? String(h.type).toUpperCase()
          : "PUBLIC",
        description: h.description ? String(h.description).trim() : "",
        isOptional: Boolean(h.isOptional),
      });
    }

    return sanitized;
  }

  // ─── Business Methods ────────────────────────────────────────────────────

  /**
   * Create a new Holiday Calendar
   */
  async createCalendar(data, actorId, authContext = {}) {
    this._assertCanManageHolidays(authContext);
    const { name, year, branchId = null, holidays = [], isActive = true } = data;

    if (!name || !year) {
      throw ApiError.badRequest("Calendar name and year are required.");
    }

    const numYear = parseInt(year, 10);
    if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
      throw ApiError.badRequest("Year must be a valid integer between 2000 and 2100.");
    }

    const todayStr = getCurrentDateInConfiguredTimezone();
    const currentYear = parseInt(todayStr.split("-")[0], 10);
    if (numYear < currentYear) {
      throw ApiError.badRequest(`Cannot create holiday calendar for past year ${numYear}. Calendar year must be ${currentYear} or later.`);
    }

    // Branch authorization check
    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        throw ApiError.badRequest("Invalid branch ID format.");
      }
      this._assertBranchAuthorized(branchId, authContext);
      const branchExists = await Branch.findById(branchId);
      if (!branchExists || branchExists.isActive === false) {
        throw ApiError.badRequest("Specified branch does not exist or is inactive.");
      }
    } else {
      if (!this._isSuperAdmin(authContext)) {
        throw ApiError.forbidden("Only Super Admin can create organization-wide holiday calendars.");
      }
    }

    // Check for duplicate calendar for same year and branch
    const conflictQuery = branchId ? { year: numYear, branchId } : { year: numYear, branchId: null };
    const existing = await HolidayCalendar.findOne(conflictQuery);
    if (existing) {
      throw ApiError.conflict(
        branchId
          ? `A holiday calendar ('${existing.name}') already exists for this branch in year ${numYear}.`
          : `An organization-wide holiday calendar ('${existing.name}') already exists for year ${numYear}.`
      );
    }

    const validatedHolidays = this._validateHolidaysArray(holidays, numYear);

    const calendar = await HolidayCalendar.create({
      name: name.trim(),
      year: numYear,
      branchId: branchId || null,
      holidays: validatedHolidays,
      isActive: Boolean(isActive),
      createdBy: actorId || null,
      updatedBy: actorId || null,
    });

    await AuditHelper.log({
      action: "HOLIDAY_CALENDAR_CREATE",
      actorId,
      entityType: "HOLIDAY_CALENDAR",
      entityId: calendar._id,
      branchId: calendar.branchId,
      after: calendar.toObject(),
    });

    return calendar;
  }

  /**
   * Retrieve list of holiday calendars
   */
  async getCalendars({ year, branchId, isActive } = {}, pagination = {}, authContext = {}) {
    const query = {};

    if (!this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      if (authorizedBranchIds.length === 0) {
        return { calendars: [], total: 0, page: 1, pages: 1 };
      }
      query.$or = [
        { branchId: { $in: authorizedBranchIds } },
        { branchId: null },
      ];
    }

    if (year !== undefined && year !== "") {
      query.year = parseInt(year, 10);
    }

    if (branchId !== undefined) {
      if (branchId === "null" || branchId === null || branchId === "") {
        query.branchId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
          throw ApiError.badRequest("Invalid branch ID format.");
        }
        query.branchId = branchId;
      }
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.max(1, parseInt(pagination.limit, 10) || 50);
    const skip = (page - 1) * limit;

    const [calendars, total] = await Promise.all([
      HolidayCalendar.find(query)
        .populate("branchId", "name code location")
        .sort({ year: -1, branchId: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HolidayCalendar.countDocuments(query),
    ]);

    return {
      calendars,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single calendar by ID
   */
  async getCalendarById(id, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid holiday calendar ID format.");
    }

    const calendar = await HolidayCalendar.findById(id)
      .populate("branchId", "name code location")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!calendar) {
      throw ApiError.notFound("Holiday calendar not found.");
    }

    if (calendar.branchId && !this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      const bStr = calendar.branchId._id ? calendar.branchId._id.toString() : calendar.branchId.toString();
      if (!authorizedBranchIds.includes(bStr)) {
        throw ApiError.forbidden("Access denied: You are not authorized to view calendars for this branch.");
      }
    }

    return calendar;
  }

  /**
   * Update calendar
   */
  async updateCalendar(id, data, actorId, authContext = {}) {
    this._assertCanManageHolidays(authContext);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid holiday calendar ID format.");
    }

    const existing = await HolidayCalendar.findById(id);
    if (!existing) {
      throw ApiError.notFound("Holiday calendar not found.");
    }

    if (existing.branchId) {
      this._assertBranchAuthorized(existing.branchId, authContext);
    } else if (!this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Access denied: Only Super Admin can modify organization-wide holiday calendars.");
    }

    if (data.name !== undefined) existing.name = data.name.trim();
    if (data.year !== undefined) {
      const numYear = parseInt(data.year, 10);
      if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
        throw ApiError.badRequest("Year must be between 2000 and 2100.");
      }
      const todayStr = getCurrentDateInConfiguredTimezone();
      const currentYear = parseInt(todayStr.split("-")[0], 10);
      if (numYear < currentYear) {
        throw ApiError.badRequest(`Cannot update holiday calendar to past year ${numYear}. Calendar year must be ${currentYear} or later.`);
      }
      existing.year = numYear;
    }

    if (data.holidays !== undefined) {
      existing.holidays = this._validateHolidaysArray(data.holidays, existing.year, { rejectPast: true });
    } else if (data.year !== undefined && existing.holidays && existing.holidays.length > 0) {
      existing.holidays = this._validateHolidaysArray(existing.holidays, existing.year, { rejectPast: true });
    }

    if (data.isActive !== undefined) existing.isActive = Boolean(data.isActive);
    existing.updatedBy = actorId || null;

    const beforeState = existing.toObject();
    await existing.save();

    await AuditHelper.log({
      action: "HOLIDAY_CALENDAR_UPDATE",
      actorId,
      entityType: "HOLIDAY_CALENDAR",
      entityId: existing._id,
      branchId: existing.branchId,
      before: beforeState,
      after: existing.toObject(),
    });

    return existing;
  }

  /**
   * Activate or deactivate a holiday calendar
   */
  async updateStatus(id, isActive, actorId, authContext = {}) {
    this._assertCanManageHolidays(authContext);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid holiday calendar ID format.");
    }

    const existing = await HolidayCalendar.findById(id);
    if (!existing) {
      throw ApiError.notFound("Holiday calendar not found.");
    }

    if (existing.branchId) {
      this._assertBranchAuthorized(existing.branchId, authContext);
    } else if (!this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Access denied: Only Super Admin can modify organization-wide holiday calendars.");
    }

    const boolStatus = Boolean(isActive);
    const beforeState = existing.toObject();
    existing.isActive = boolStatus;
    existing.updatedBy = actorId || null;
    await existing.save();

    await AuditHelper.log({
      action: boolStatus ? "HOLIDAY_CALENDAR_ACTIVATE" : "HOLIDAY_CALENDAR_DEACTIVATE",
      actorId,
      entityType: "HOLIDAY_CALENDAR",
      entityId: existing._id,
      branchId: existing.branchId,
      before: beforeState,
      after: existing.toObject(),
    });

    return existing;
  }

  /**
   * DELETE /api/holiday-calendars/:id
   */
  async deleteCalendar(id, actorId, authContext) {
    this._assertCanManageHolidays(authContext);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid holiday calendar ID format.");
    }

    const existing = await HolidayCalendar.findById(id);
    if (!existing) {
      throw ApiError.notFound("Holiday calendar not found.");
    }

    if (existing.branchId) {
      this._assertBranchAuthorized(existing.branchId, authContext);
    } else if (!this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Access denied: Only Super Admin can delete organization-wide holiday calendars.");
    }

    const beforeState = existing.toObject();
    await HolidayCalendar.findByIdAndDelete(id);

    await AuditHelper.log({
      action: "HOLIDAY_CALENDAR_DELETE",
      actorId,
      entityType: "HOLIDAY_CALENDAR",
      entityId: existing._id,
      branchId: existing.branchId,
      before: beforeState,
      after: null,
    });

    return { _id: id, message: "Holiday calendar deleted successfully." };
  }

  _toIdFilter(val) {
    if (!val) return val;
    const s = val._id ? val._id.toString() : val.toString();
    if (mongoose.Types.ObjectId.isValid(s)) {
      return { $in: [s, new mongoose.Types.ObjectId(s)] };
    }
    return s;
  }

  /**
   * Resolve effective holiday calendar and check if a given date is a holiday
   * Priority:
   * 1. Branch-specific active calendar for the given date's year
   * 2. Organization-wide active calendar for the given date's year
   *
   * @param {string|ObjectId} branchId
   * @param {string} dateStr - "YYYY-MM-DD"
   * @returns {Promise<{ calendar: Object|null, isHoliday: boolean, holiday: Object|null }>}
   */
  async resolveEffectiveCalendar(branchId, dateStr) {
    if (!dateStr) {
      return { calendar: null, isHoliday: false, isOptionalHoliday: false, holiday: null };
    }

    let cleanDate = typeof dateStr === "string" ? dateStr.trim() : "";
    if (cleanDate.includes("T")) {
      cleanDate = cleanDate.split("T")[0].trim();
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return { calendar: null, isHoliday: false, isOptionalHoliday: false, holiday: null };
    }

    const year = parseInt(cleanDate.substring(0, 4), 10);

    // Priority:
    // 1. Branch-specific active calendar for the given date's year
    // 2. Organization-wide active calendar (branchId: null) for the given date's year
    let calendar = null;
    if (branchId) {
      calendar = await HolidayCalendar.findOne({
        branchId: this._toIdFilter(branchId),
        year,
        isActive: true,
      }).lean();
    }
    if (!calendar) {
      calendar = await HolidayCalendar.findOne({
        branchId: null,
        year,
        isActive: true,
      }).lean();
    }

    if (!calendar || !Array.isArray(calendar.holidays)) {
      return { calendar: null, isHoliday: false, isOptionalHoliday: false, holiday: null };
    }

    // Strict date-only comparison without timezone shift
    const holiday = calendar.holidays.find((h) => h && String(h.date).trim() === cleanDate);
    const isOptional = Boolean(holiday && (holiday.isOptional === true || holiday.type === "OPTIONAL"));
    const isMandatoryHoliday = Boolean(holiday && !isOptional);

    return {
      calendar,
      isHoliday: isMandatoryHoliday,
      isOptionalHoliday: isOptional,
      holiday: holiday || null,
    };
  }

  /**
   * Get all mandatory holidays in a date range for a given branch
   * @param {string|ObjectId} branchId
   * @param {string} startDate - "YYYY-MM-DD"
   * @param {string} endDate - "YYYY-MM-DD"
   * @returns {Promise<Array<{ date: string, name: string, type: string, description: string, calendarId: ObjectId }>>}
   */
  async getHolidaysInRange(branchId, startDate, endDate) {
    if (!startDate || !endDate) return [];
    const startYear = parseInt(startDate.substring(0, 4), 10);
    const endYear = parseInt(endDate.substring(0, 4), 10);
    if (isNaN(startYear) || isNaN(endYear)) return [];

    const holidays = [];
    const dateSet = new Set();

    for (let y = startYear; y <= endYear; y++) {
      let cal = null;
      if (branchId) {
        cal = await HolidayCalendar.findOne({
          branchId: this._toIdFilter(branchId),
          year: y,
          isActive: true,
        }).lean();
      }
      if (!cal) {
        cal = await HolidayCalendar.findOne({
          branchId: null,
          year: y,
          isActive: true,
        }).lean();
      }

      if (cal && Array.isArray(cal.holidays)) {
        for (const h of cal.holidays) {
          if (!h || !h.date) continue;
          const isOptional = Boolean(h.isOptional === true || h.type === "OPTIONAL");
          if (isOptional) continue; // Only mandatory holidays
          if (h.date >= startDate && h.date <= endDate) {
            if (!dateSet.has(h.date)) {
              dateSet.add(h.date);
              holidays.push({
                date: h.date,
                name: h.name,
                type: h.type || "PUBLIC",
                description: h.description || "",
                calendarId: cal._id,
              });
            }
          }
        }
      }
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }
}

module.exports = new HolidayCalendarService();
