const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const { validate } = require("../../../middleware/validation.middleware");

const { validateStrictDate, getCurrentDateInConfiguredTimezone } = require("../../../utils/attendanceDateUtils");

const calendarIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Calendar ID is required")
    .isMongoId()
    .withMessage("Invalid holiday calendar ID format."),
  validate,
];

const getCalendarsQueryValidator = [
  query("branchId")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) {
        return true;
      }
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error("Invalid branch ID format.");
      }
      return true;
    }),
  query("year")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Year must be between 2000 and 2100"),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  validate,
];

const createCalendarValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Calendar name is required"),
  body("year")
    .notEmpty()
    .withMessage("Year is required")
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Year must be between 2000 and 2100")
    .custom((val) => {
      const todayStr = getCurrentDateInConfiguredTimezone();
      const currentYear = parseInt(todayStr.split("-")[0], 10);
      if (parseInt(val, 10) < currentYear) {
        throw new Error(`Cannot create holiday calendar for past year ${val}. Calendar year must be ${currentYear} or later.`);
      }
      return true;
    }),
  body("branchId")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) {
        return true;
      }
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error("Invalid branch ID format.");
      }
      return true;
    }),
  body("holidays")
    .optional()
    .isArray()
    .withMessage("Holidays must be an array of holiday objects")
    .custom((holidays, { req }) => {
      if (!Array.isArray(holidays)) return true;
      const targetYear = req.body.year ? parseInt(req.body.year, 10) : null;
      const dateSet = new Set();

      for (let i = 0; i < holidays.length; i++) {
        const h = holidays[i];
        if (!h || typeof h !== "object") {
          throw new Error(`Holiday at index ${i} must be an object with name and date.`);
        }
        if (!h.name || typeof h.name !== "string" || !h.name.trim()) {
          throw new Error(`Holiday at index ${i} requires a non-empty name.`);
        }
        if (!h.date) {
          throw new Error(`Holiday '${h.name.trim()}' requires a valid YYYY-MM-DD date.`);
        }

        const dateStr = String(h.date).trim();
        const validation = validateStrictDate(dateStr, targetYear, { rejectPast: true });
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        if (dateSet.has(dateStr)) {
          throw new Error(`Duplicate holiday date '${dateStr}' found in calendar entries.`);
        }
        dateSet.add(dateStr);
      }
      return true;
    }),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  validate,
];

const updateCalendarValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Calendar ID is required")
    .isMongoId()
    .withMessage("Invalid holiday calendar ID format."),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Calendar name cannot be empty"),
  body("year")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Year must be between 2000 and 2100")
    .custom((val) => {
      const todayStr = getCurrentDateInConfiguredTimezone();
      const currentYear = parseInt(todayStr.split("-")[0], 10);
      if (parseInt(val, 10) < currentYear) {
        throw new Error(`Cannot update holiday calendar to past year ${val}. Calendar year must be ${currentYear} or later.`);
      }
      return true;
    }),
  body("branchId")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) {
        return true;
      }
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error("Invalid branch ID format.");
      }
      return true;
    }),
  body("holidays")
    .optional()
    .isArray()
    .withMessage("Holidays must be an array of holiday objects")
    .custom((holidays, { req }) => {
      if (!Array.isArray(holidays)) return true;
      const targetYear = req.body.year ? parseInt(req.body.year, 10) : null;
      const dateSet = new Set();

      for (let i = 0; i < holidays.length; i++) {
        const h = holidays[i];
        if (!h || typeof h !== "object") {
          throw new Error(`Holiday at index ${i} must be an object with name and date.`);
        }
        if (!h.name || typeof h.name !== "string" || !h.name.trim()) {
          throw new Error(`Holiday at index ${i} requires a non-empty name.`);
        }
        if (!h.date) {
          throw new Error(`Holiday '${h.name.trim()}' requires a valid YYYY-MM-DD date.`);
        }

        const dateStr = String(h.date).trim();
        const validation = validateStrictDate(dateStr, targetYear, { rejectPast: true });
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        if (dateSet.has(dateStr)) {
          throw new Error(`Duplicate holiday date '${dateStr}' found in calendar entries.`);
        }
        dateSet.add(dateStr);
      }
      return true;
    }),
  body("isActive")
    .optional()
    .isBoolean(),
  validate,
];

const calendarStatusValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Calendar ID is required")
    .isMongoId()
    .withMessage("Invalid holiday calendar ID format."),
  validate,
];

module.exports = {
  calendarIdParamValidator,
  getCalendarsQueryValidator,
  createCalendarValidator,
  updateCalendarValidator,
  calendarStatusValidator,
};
