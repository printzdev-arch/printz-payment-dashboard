const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const { validate } = require("../../../middleware/request/validation.middleware");

const attendanceIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Attendance record ID is required")
    .isMongoId()
    .withMessage("Invalid attendance record ID format."),
  validate,
];

const getAttendanceQueryValidator = [
  query("branchId")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) return true;
      if (!mongoose.Types.ObjectId.isValid(val)) throw new Error("Invalid branch ID format.");
      return true;
    }),
  query("employeeId")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) return true;
      if (!mongoose.Types.ObjectId.isValid(val)) throw new Error("Invalid employee ID format.");
      return true;
    }),
  query("startDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("startDate must be in YYYY-MM-DD format"),
  query("endDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("endDate must be in YYYY-MM-DD format"),
  query("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("month must be an integer between 1 and 12"),
  query("year")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("year must be an integer between 2000 and 2100"),
  validate,
];

const dateAndBranchQueryValidator = [
  query("branchId")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) return true;
      if (!mongoose.Types.ObjectId.isValid(val)) throw new Error("Invalid branch ID format.");
      return true;
    }),
  query("attendanceDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  query("date")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("date must be in YYYY-MM-DD format"),
  query("startDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("startDate must be in YYYY-MM-DD format"),
  query("endDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("endDate must be in YYYY-MM-DD format"),
  query("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("month must be an integer between 1 and 12"),
  query("year")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("year must be an integer between 2000 and 2100"),
  query("employeeId")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) return true;
      if (!mongoose.Types.ObjectId.isValid(val)) throw new Error("Invalid employee ID format.");
      return true;
    }),
  validate,
];

const createAttendanceValidator = [
  body("employeeId")
    .trim()
    .notEmpty()
    .withMessage("employeeId is required")
    .isMongoId()
    .withMessage("Invalid employee ID format."),
  body("branchId")
    .optional({ nullable: true })
    .trim()
    .custom((val) => {
      if (!val) return true;
      if (!mongoose.Types.ObjectId.isValid(val)) throw new Error("Invalid branch ID format.");
      return true;
    }),
  body("attendanceDate")
    .trim()
    .notEmpty()
    .withMessage("attendanceDate is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  body("checkIn")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("checkIn must be in HH:mm format (00:00 - 23:59)"),
  body("checkOut")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("checkOut must be in HH:mm format (00:00 - 23:59)"),
  body("status")
    .optional({ nullable: true })
    .isIn(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF", "PENDING"])
    .withMessage("Status must be one of: PRESENT, ABSENT, HALF_DAY, ON_LEAVE, HOLIDAY, WEEKLY_OFF, PENDING"),
  body("overtimeHours")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("overtimeHours cannot be negative"),
  body("leavePaymentType")
    .optional({ nullable: true })
    .isIn(["PAID", "UNPAID"])
    .withMessage("leavePaymentType must be PAID or UNPAID"),
  body("remarks")
    .optional()
    .isString(),
  validate,
];

const updateAttendanceValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Attendance record ID is required")
    .isMongoId()
    .withMessage("Invalid attendance record ID format."),
  body("branchId")
    .optional({ nullable: true })
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) return true;
      if (!mongoose.Types.ObjectId.isValid(val)) throw new Error("Invalid branch ID format.");
      return true;
    }),
  body("attendanceDate")
    .optional({ nullable: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  body("checkIn")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("checkIn must be in HH:mm format"),
  body("checkOut")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("checkOut must be in HH:mm format"),
  body("status")
    .optional()
    .isIn(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF", "PENDING"])
    .withMessage("Status must be one of: PRESENT, ABSENT, HALF_DAY, ON_LEAVE, HOLIDAY, WEEKLY_OFF, PENDING"),
  body("overtimeHours")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("overtimeHours cannot be negative"),
  body("overtimeStatus")
    .optional()
    .isIn(["NONE", "PENDING", "APPROVED", "REJECTED"])
    .withMessage("overtimeStatus must be one of: NONE, PENDING, APPROVED, REJECTED"),
  body("leavePaymentType")
    .optional({ nullable: true })
    .isIn(["PAID", "UNPAID"])
    .withMessage("leavePaymentType must be PAID or UNPAID"),
  body("remarks")
    .optional()
    .isString(),
  validate,
];


const reconcileValidator = [
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID format."),
  body("attendanceDate")
    .trim()
    .notEmpty()
    .withMessage("attendanceDate is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  body("records")
    .optional()
    .isArray()
    .withMessage("records must be an array of attendance items"),
  body("records.*.employeeId")
    .optional()
    .custom((val) => {
      if (val === "" || val === "null" || val === null || val === undefined) return true;
      if (!mongoose.Types.ObjectId.isValid(val)) throw new Error("Invalid employee ID format.");
      return true;
    }),
  body("records.*.leavePaymentType")
    .optional({ nullable: true })
    .isIn(["PAID", "UNPAID"])
    .withMessage("leavePaymentType must be PAID or UNPAID"),
  body("autoFillAbsent")
    .optional()
    .isBoolean()
    .withMessage("autoFillAbsent must be a boolean"),
  validate,
];

const checkInValidator = [
  body("employeeId")
    .trim()
    .notEmpty()
    .withMessage("employeeId is required")
    .isMongoId()
    .withMessage("Invalid employee ID format."),
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID format."),
  body("attendanceDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  body("checkIn")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("checkIn must be in HH:mm format (00:00 - 23:59)"),
  body("remarks")
    .optional()
    .isString(),
  validate,
];

const checkOutValidator = [
  body("employeeId")
    .trim()
    .notEmpty()
    .withMessage("employeeId is required")
    .isMongoId()
    .withMessage("Invalid employee ID format."),
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID format."),
  body("attendanceDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  body("checkOut")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("checkOut must be in HH:mm format (00:00 - 23:59)"),
  body("remarks")
    .optional()
    .isString(),
  validate,
];

const batchPunchValidator = [
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID format."),
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Punch type is required ('CHECK_IN' or 'CHECK_OUT')")
    .isIn(["CHECK_IN", "CHECK_OUT"])
    .withMessage("Punch type must be 'CHECK_IN' or 'CHECK_OUT'"),
  body("employeeIds")
    .isArray({ min: 1 })
    .withMessage("employeeIds must be a non-empty array of employee IDs"),
  body("employeeIds.*")
    .isMongoId()
    .withMessage("Each employeeId must be a valid Mongo ID"),
  body("attendanceDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  body("time")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("time must be in HH:mm format (00:00 - 23:59)"),
  body("remarks")
    .optional()
    .isString(),
  validate,
];

const finalizeAttendanceValidator = [
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID format."),
  body("attendanceDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  body("startDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("startDate must be in YYYY-MM-DD format"),
  body("endDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("endDate must be in YYYY-MM-DD format"),
  validate,
];

const reopenAttendanceValidator = [
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID format."),
  body("attendanceDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("attendanceDate must be in YYYY-MM-DD format"),
  body("startDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("startDate must be in YYYY-MM-DD format"),
  body("endDate")
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("endDate must be in YYYY-MM-DD format"),
  validate,
];

module.exports = {
  attendanceIdParamValidator,
  getAttendanceQueryValidator,
  dateAndBranchQueryValidator,
  createAttendanceValidator,
  updateAttendanceValidator,
  reconcileValidator,
  checkInValidator,
  checkOutValidator,
  batchPunchValidator,
  finalizeAttendanceValidator,
  reopenAttendanceValidator,
};

