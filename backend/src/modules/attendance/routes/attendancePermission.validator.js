const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const { validate } = require("../../../middleware/request/validation.middleware");
const { validateStrictDate } = require("../../../utils/helpers/attendanceDateUtils");

const permissionIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Permission ID is required")
    .isMongoId()
    .withMessage("Invalid permission ID format."),
  validate,
];

const getPermissionsQueryValidator = [
  query("branchId")
    .optional({ nullable: true })
    .custom((val) => {
      if (!val || val === "null" || val === "undefined") return true;
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error("Invalid branch ID format.");
      }
      return true;
    }),
  query("employeeId")
    .optional({ nullable: true })
    .custom((val) => {
      if (!val || val === "null" || val === "undefined") return true;
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error("Invalid employee ID format.");
      }
      return true;
    }),
  query("status")
    .optional()
    .toUpperCase()
    .isIn(["APPROVED", "CANCELLED", "PENDING", "REJECTED"])
    .withMessage("Status must be one of: APPROVED, CANCELLED"),
  query("date")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be in YYYY-MM-DD format"),
  query("permissionDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("permissionDate must be in YYYY-MM-DD format"),
  query("year")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Year must be between 2000 and 2100"),
  query("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Month must be between 1 and 12"),
  validate,
];

const createPermissionValidator = [
  body("employeeId")
    .trim()
    .notEmpty()
    .withMessage("employeeId is required")
    .isMongoId()
    .withMessage("Invalid employee ID format."),
  body("branchId")
    .optional({ nullable: true })
    .custom((val) => {
      if (!val || val === "null" || val === "undefined") return true;
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error("Invalid branch ID format.");
      }
      return true;
    }),
  body("permissionDate")
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("permissionDate must be in YYYY-MM-DD format")
    .custom((val) => {
      const v = validateStrictDate(val);
      if (!v.isValid) {
        throw new Error(v.error);
      }
      return true;
    }),
  body("date")
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("date must be in YYYY-MM-DD format")
    .custom((val) => {
      const v = validateStrictDate(val);
      if (!v.isValid) {
        throw new Error(v.error);
      }
      return true;
    }),
  body().custom((bodyObj) => {
    const d = bodyObj.permissionDate || bodyObj.date;
    if (!d || !d.trim()) {
      throw new Error("permissionDate is required (YYYY-MM-DD).");
    }
    return true;
  }),
  body("startTime")
    .trim()
    .notEmpty()
    .withMessage("startTime is required (HH:mm)")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("startTime must be in HH:mm format (00:00 - 23:59)"),
  body("endTime")
    .trim()
    .notEmpty()
    .withMessage("endTime is required (HH:mm)")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("endTime must be in HH:mm format (00:00 - 23:59)")
    .custom((endTimeVal, { req }) => {
      const start = req.body?.startTime?.trim();
      if (start && /^([01]\d|2[0-3]):([0-5]\d)$/.test(start)) {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = endTimeVal.trim().split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (endMin <= startMin) {
          throw new Error("endTime must be strictly after startTime.");
        }
      }
      return true;
    }),
  body("durationHours")
    .optional({ nullable: true })
    .isFloat({ min: 0.01, max: 24 })
    .withMessage("durationHours must be a positive number up to 24")
    .custom((durationVal, { req }) => {
      const start = req.body?.startTime?.trim();
      const end = req.body?.endTime?.trim();
      if (start && end && /^([01]\d|2[0-3]):([0-5]\d)$/.test(start) && /^([01]\d|2[0-3]):([0-5]\d)$/.test(end)) {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (endMin > startMin) {
          const expected = Math.round(((endMin - startMin) / 60) * 100) / 100;
          if (Math.abs(Number(durationVal) - expected) > 0.01) {
            throw new Error(
              `durationHours (${durationVal}) does not match the time interval between startTime and endTime (${expected} hours).`
            );
          }
        }
      }
      return true;
    }),
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Reason for permission is required"),
  validate,
];

const updatePermissionValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Permission ID is required")
    .isMongoId()
    .withMessage("Invalid permission ID format."),
  body("permissionDate")
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("permissionDate must be in YYYY-MM-DD format")
    .custom((val) => {
      const v = validateStrictDate(val);
      if (!v.isValid) {
        throw new Error(v.error);
      }
      return true;
    }),
  body("date")
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("date must be in YYYY-MM-DD format"),
  body("startTime")
    .optional()
    .trim()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("startTime must be in HH:mm format (00:00 - 23:59)"),
  body("endTime")
    .optional()
    .trim()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("endTime must be in HH:mm format (00:00 - 23:59)"),
  body("reason")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Reason cannot be empty"),
  validate,
];

module.exports = {
  permissionIdParamValidator,
  getPermissionsQueryValidator,
  createPermissionValidator,
  updatePermissionValidator,
};
