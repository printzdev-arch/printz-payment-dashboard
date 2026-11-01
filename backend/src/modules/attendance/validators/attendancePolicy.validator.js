const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const { validate } = require("../../../middleware/validation.middleware");

const policyIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Policy ID is required")
    .isMongoId()
    .withMessage("Invalid attendance policy ID format."),
  validate,
];

const getPoliciesQueryValidator = [
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
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  validate,
];

const createPolicyValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Policy name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Policy name must be between 2 and 100 characters"),
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Policy code is required")
    .isLength({ min: 2, max: 30 })
    .withMessage("Policy code must be between 2 and 30 characters"),
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
  body("shiftStartTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Shift start time must be in HH:mm format (00:00 - 23:59)"),
  body("shiftEndTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Shift end time must be in HH:mm format (00:00 - 23:59)"),
  body("workingHoursPerDay")
    .optional()
    .isFloat({ min: 1, max: 24 })
    .withMessage("Working hours per day must be between 1 and 24"),
  body("halfDayHours")
    .optional()
    .isFloat({ min: 0.5, max: 24 })
    .withMessage("Half day hours must be between 0.5 and 24"),
  body("fullDayHours")
    .optional()
    .isFloat({ min: 1, max: 24 })
    .withMessage("Full day hours must be between 1 and 24"),
  body("lateGraceMinutes")
    .optional()
    .isInt({ min: 0, max: 180 })
    .withMessage("Late grace minutes must be between 0 and 180"),
  body("earlyCheckoutGraceMinutes")
    .optional()
    .isInt({ min: 0, max: 180 })
    .withMessage("Early checkout grace minutes must be between 0 and 180"),
  body("breakDurationMinutes")
    .optional()
    .isInt({ min: 0, max: 240 })
    .withMessage("Break duration minutes must be between 0 and 240"),
  body("weeklyOffDays")
    .optional()
    .isArray()
    .withMessage("Weekly off days must be an array of numbers (0-6)"),
  body("workingDays")
    .optional()
    .isArray()
    .withMessage("workingDays must be an array of day names"),
  body("monthlyLeaveAllowance")
    .optional()
    .isInt({ min: 0, max: 31 })
    .withMessage("monthlyLeaveAllowance must be an integer between 0 and 31"),
  body("overtimeEnabled")
    .optional()
    .isBoolean()
    .withMessage("overtimeEnabled must be a boolean"),
  body("permissionEnabled")
    .optional()
    .isBoolean()
    .withMessage("permissionEnabled must be a boolean"),
  body("maxPermissionHoursPerDay")
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage("maxPermissionHoursPerDay must be between 0 and 24 hours"),
  body("maxPermissionHoursPerMonth")
    .optional()
    .isFloat({ min: 0, max: 744 })
    .withMessage("maxPermissionHoursPerMonth must be between 0 and 744 hours"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body().custom((b) => {
    const shiftStart = b.shiftStartTime || "09:00";
    const shiftEnd = b.shiftEndTime || "18:00";
    const timeToMin = (t) => {
      const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t).trim());
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
    };
    const startMin = timeToMin(shiftStart);
    const endMin = timeToMin(shiftEnd);
    if (startMin !== null && endMin !== null) {
      if (startMin === endMin) {
        throw new Error("Shift start time and end time cannot be identical.");
      }
      const shiftDuration = endMin > startMin ? endMin - startMin : (1440 - startMin) + endMin;
      const breakMins = b.breakDurationMinutes !== undefined ? Number(b.breakDurationMinutes) : 60;
      if (breakMins >= shiftDuration) {
        throw new Error(`Break duration (${breakMins} mins) must be strictly less than total shift duration (${shiftDuration} mins).`);
      }
      const workingHours = b.workingHoursPerDay !== undefined ? Number(b.workingHoursPerDay) : 8;
      const reqMins = Math.round(workingHours * 60);
      if (reqMins > (shiftDuration - breakMins)) {
        throw new Error(
          `Inconsistent policy: Configured working hours per day (${workingHours} hrs) exceeds scheduled net shift duration (${Math.round(((shiftDuration - breakMins) / 60) * 100) / 100} hrs) after deducting ${breakMins} mins break.`
        );
      }
    }
    const halfDay = b.halfDayHours !== undefined ? Number(b.halfDayHours) : 4;
    const fullDay = b.fullDayHours !== undefined ? Number(b.fullDayHours) : 8;
    if (halfDay >= fullDay) {
      throw new Error("halfDayHours must be strictly less than fullDayHours.");
    }
    return true;
  }),
  validate,
];

const updatePolicyValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Policy ID is required")
    .isMongoId()
    .withMessage("Invalid attendance policy ID format."),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Policy name must be between 2 and 100 characters"),
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
  body("shiftStartTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Shift start time must be in HH:mm format"),
  body("shiftEndTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Shift end time must be in HH:mm format"),
  body("workingHoursPerDay")
    .optional()
    .isFloat({ min: 1, max: 24 })
    .withMessage("Working hours per day must be between 1 and 24"),
  body("halfDayHours")
    .optional()
    .isFloat({ min: 0.5, max: 24 }),
  body("fullDayHours")
    .optional()
    .isFloat({ min: 1, max: 24 }),
  body("lateGraceMinutes")
    .optional()
    .isInt({ min: 0, max: 180 }),
  body("earlyCheckoutGraceMinutes")
    .optional()
    .isInt({ min: 0, max: 180 }),
  body("breakDurationMinutes")
    .optional()
    .isInt({ min: 0, max: 240 }),
  body("weeklyOffDays")
    .optional()
    .isArray(),
  body("workingDays")
    .optional()
    .isArray(),
  body("monthlyLeaveAllowance")
    .optional()
    .isInt({ min: 0, max: 31 }),
  body("overtimeEnabled")
    .optional()
    .isBoolean(),
  body("permissionEnabled")
    .optional()
    .isBoolean(),
  body("maxPermissionHoursPerDay")
    .optional()
    .isFloat({ min: 0, max: 24 }),
  body("maxPermissionHoursPerMonth")
    .optional()
    .isFloat({ min: 0, max: 744 }),
  body("isActive")
    .optional()
    .isBoolean(),
  body().custom((b) => {
    if (b.shiftStartTime && b.shiftEndTime) {
      const timeToMin = (t) => {
        const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t).trim());
        return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
      };
      const startMin = timeToMin(b.shiftStartTime);
      const endMin = timeToMin(b.shiftEndTime);
      if (startMin !== null && endMin !== null) {
        if (startMin === endMin) {
          throw new Error("Shift start time and end time cannot be identical.");
        }
        const shiftDuration = endMin > startMin ? endMin - startMin : (1440 - startMin) + endMin;
        if (b.breakDurationMinutes !== undefined && Number(b.breakDurationMinutes) >= shiftDuration) {
          throw new Error(`Break duration (${b.breakDurationMinutes} mins) must be strictly less than total shift duration (${shiftDuration} mins).`);
        }
      }
    }
    if (b.halfDayHours !== undefined && b.fullDayHours !== undefined) {
      if (Number(b.halfDayHours) >= Number(b.fullDayHours)) {
        throw new Error("halfDayHours must be strictly less than fullDayHours.");
      }
    }
    return true;
  }),
  validate,
];

const policyStatusValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Policy ID is required")
    .isMongoId()
    .withMessage("Invalid attendance policy ID format."),
  validate,
];

module.exports = {
  policyIdParamValidator,
  getPoliciesQueryValidator,
  createPolicyValidator,
  updatePolicyValidator,
  policyStatusValidator,
};
