const { body, param, query } = require("express-validator");
const { validate } = require("../../../middleware/request/validation.middleware");

const runIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Salary run ID is required.")
    .isMongoId()
    .withMessage("Invalid salary run ID format."),
  validate,
];

const createRunValidator = [
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required."),
  body("payrollMonth")
    .isInt({ min: 1, max: 12 })
    .withMessage("payrollMonth must be an integer between 1 and 12."),
  body("payrollYear")
    .isInt({ min: 2000, max: 2100 })
    .withMessage("payrollYear must be an integer between 2000 and 2100."),
  validate,
];

const listRunsQueryValidator = [
  query("branchId").optional().trim(),
  query("payrollMonth").optional().isInt({ min: 1, max: 12 }).withMessage("payrollMonth must be 1-12."),
  query("payrollYear").optional().isInt({ min: 2000, max: 2100 }).withMessage("Invalid payrollYear."),
  query("status").optional().isIn(["DRAFT", "CALCULATING", "CALCULATED", "APPROVED", "PAID", "LOCKED"]).withMessage("Invalid status."),
  validate,
];

const listRecordsQueryValidator = [
  query("salaryRunId").optional().isMongoId().withMessage("Invalid salaryRunId format."),
  query("salaryRecordId").optional().trim(),
  query("employeeId").optional().trim(),
  query("branchId").optional().trim(),
  query("payrollMonth").optional().isInt({ min: 1, max: 12 }),
  query("payrollYear").optional().isInt({ min: 2000, max: 2100 }),
  query("status").optional().isIn(["DRAFT", "CALCULATED", "APPROVED", "PARTIALLY_PAID", "PAID", "LOCKED"]),
  validate,
];

const listEntriesQueryValidator = listRecordsQueryValidator;

const componentValidator = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Component code is required.")
    .isLength({ min: 2, max: 50 })
    .withMessage("Component code must be between 2 and 50 characters."),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Component name is required."),
  body("componentType")
    .isIn(["EARNING", "DEDUCTION"])
    .withMessage("componentType must be EARNING or DEDUCTION."),
  body("calculationType")
    .optional()
    .isIn(["FIXED", "PERCENTAGE", "PER_DAY", "PER_HOUR", "MANUAL"])
    .withMessage("Invalid calculationType."),
  body("defaultAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("defaultAmount cannot be negative."),
  body("percentageOf")
    .optional()
    .isIn(["BASIC", "GROSS", "MONTHLY_SALARY"])
    .withMessage("Invalid percentageOf."),
  body("isTaxable")
    .optional()
    .isBoolean()
    .withMessage("isTaxable must be a boolean."),
  body("description")
    .optional()
    .trim(),
  validate,
];

const componentIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Salary component ID is required.")
    .isMongoId()
    .withMessage("Invalid salary component ID format."),
  validate,
];

const structureValidator = [
  body("employeeId")
    .trim()
    .notEmpty()
    .withMessage("employeeId is required."),
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required."),
  body("effectiveFrom")
    .notEmpty()
    .withMessage("effectiveFrom is required.")
    .isISO8601()
    .withMessage("effectiveFrom must be a valid ISO8601 date."),
  body("effectiveTo")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("effectiveTo must be a valid ISO8601 date."),
  body("monthlySalary")
    .isFloat({ min: 0 })
    .withMessage("monthlySalary must be a non-negative number."),
  body("components")
    .optional()
    .isArray()
    .withMessage("components must be an array."),
  body("components.*.componentId")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Invalid componentId in components."),
  body("components.*.amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Component amount cannot be negative."),
  body("components.*.percentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Component percentage must be between 0 and 100."),
  body("remarks")
    .optional()
    .trim(),
  validate,
];

const adjustmentValidator = [
  body("employeeId")
    .trim()
    .notEmpty()
    .withMessage("employeeId is required."),
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required."),
  body("payrollMonth")
    .isInt({ min: 1, max: 12 })
    .withMessage("payrollMonth must be an integer between 1 and 12."),
  body("payrollYear")
    .isInt({ min: 2000, max: 2100 })
    .withMessage("payrollYear must be an integer between 2000 and 2100."),
  body("adjustmentType")
    .isIn(["INCENTIVE", "ADVANCE", "SHORTAGE", "WASTAGE", "EMPLOYEE_PURCHASE", "OTHER_DEDUCTION", "OTHER_EARNING"])
    .withMessage("Invalid adjustmentType."),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("amount must be greater than zero."),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("description is required."),
  body("salaryRecordId")
    .optional()
    .trim(),
  validate,
];

const loanValidator = [
  body("employeeId")
    .trim()
    .notEmpty()
    .withMessage("employeeId is required."),
  body("branchId")
    .trim()
    .notEmpty()
    .withMessage("branchId is required."),
  body("loanAmount")
    .isFloat({ min: 0.01 })
    .withMessage("loanAmount must be greater than zero."),
  body("loanDate")
    .notEmpty()
    .withMessage("loanDate is required.")
    .isISO8601()
    .withMessage("loanDate must be a valid ISO8601 date."),
  body("emiAmount")
    .isFloat({ min: 0.01 })
    .withMessage("emiAmount must be greater than zero."),
  body("loanNumber")
    .optional()
    .trim(),
  body("remarks")
    .optional()
    .trim(),
  body("autoDeduct")
    .optional()
    .isBoolean()
    .withMessage("autoDeduct must be true or false."),
  validate,
];

const loanSkipValidator = [
  param("id")
    .trim()
    .notEmpty()
    .isMongoId()
    .withMessage("Invalid loan ID format."),
  body("month")
    .isInt({ min: 1, max: 12 })
    .withMessage("month must be an integer between 1 and 12."),
  body("year")
    .isInt({ min: 2000, max: 2100 })
    .withMessage("year must be an integer between 2000 and 2100."),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("reason must be at most 200 characters."),
  validate,
];

const repaymentValidator = [
  body("employeeLoanId")
    .trim()
    .notEmpty()
    .withMessage("employeeLoanId is required."),
  body("branchId")
    .optional()
    .trim(),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("amount must be greater than zero."),
  body("repaymentDate")
    .optional()
    .isISO8601()
    .withMessage("repaymentDate must be a valid ISO8601 date."),
  body("paymentMethod")
    .optional()
    .isIn(["SALARY_DEDUCTION", "CASH", "BANK_TRANSFER", "OTHER"])
    .withMessage("Invalid paymentMethod."),
  body("salaryRecordId")
    .optional()
    .trim(),
  body("repaymentNumber")
    .optional()
    .isInt({ min: 1 })
    .withMessage("repaymentNumber must be a positive integer."),
  body("payrollMonth")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("payrollMonth must be an integer between 1 and 12."),
  body("payrollYear")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("payrollYear must be an integer between 2000 and 2100."),
  body("remarks")
    .optional()
    .trim(),
  body("notes")
    .optional()
    .trim(),
  validate,
];

const adjustmentIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Salary adjustment ID is required.")
    .isMongoId()
    .withMessage("Invalid salary adjustment ID format."),
  validate,
];

const structureIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Salary structure ID is required.")
    .isMongoId()
    .withMessage("Invalid salary structure ID format."),
  validate,
];

const listStructuresQueryValidator = [
  query("employeeId").optional().trim(),
  query("branchId").optional().trim(),
  query("isActive")
    .optional()
    .isIn(["true", "false", true, false])
    .withMessage("isActive must be true or false."),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer."),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100."),
  validate,
];

const listAdjustmentsQueryValidator = [
  query("employeeId").optional().trim(),
  query("branchId").optional().trim(),
  query("payrollMonth").optional().isInt({ min: 1, max: 12 }).withMessage("payrollMonth must be 1-12."),
  query("payrollYear").optional().isInt({ min: 2000, max: 2100 }).withMessage("Invalid payrollYear."),
  query("status")
    .optional()
    .isIn(["PENDING", "APPLIED", "CANCELLED"])
    .withMessage("Invalid status."),
  query("adjustmentType")
    .optional()
    .isIn(["INCENTIVE", "ADVANCE", "SHORTAGE", "WASTAGE", "EMPLOYEE_PURCHASE", "OTHER_DEDUCTION", "OTHER_EARNING"])
    .withMessage("Invalid adjustmentType."),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer."),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100."),
  validate,
];

const listLoansQueryValidator = [
  query("employeeId").optional().trim(),
  query("branchId").optional().trim(),
  query("status")
    .optional()
    .isIn(["ACTIVE", "CLOSED", "ON_HOLD"])
    .withMessage("Invalid status."),
  query("loanNumber").optional().trim(),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer."),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100."),
  validate,
];

const listRepaymentsQueryValidator = [
  query("employeeId").optional().trim(),
  query("employeeLoanId").optional().isMongoId().withMessage("Invalid employeeLoanId format."),
  query("salaryRecordId").optional().isMongoId().withMessage("Invalid salaryRecordId format."),
  query("branchId").optional().trim(),
  query("payrollMonth").optional().isInt({ min: 1, max: 12 }).withMessage("payrollMonth must be 1-12."),
  query("payrollYear").optional().isInt({ min: 2000, max: 2100 }).withMessage("Invalid payrollYear."),
  query("paymentMethod")
    .optional()
    .isIn(["SALARY_DEDUCTION", "CASH", "BANK_TRANSFER", "OTHER"])
    .withMessage("Invalid paymentMethod."),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer."),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100."),
  validate,
];

module.exports = {
  runIdParamValidator,
  createRunValidator,
  listRunsQueryValidator,
  listEntriesQueryValidator,
  listRecordsQueryValidator,
  componentValidator,
  componentIdParamValidator,
  structureValidator,
  adjustmentValidator,
  adjustmentIdParamValidator,
  structureIdParamValidator,
  listStructuresQueryValidator,
  listAdjustmentsQueryValidator,
  listLoansQueryValidator,
  listRepaymentsQueryValidator,
  loanValidator,
  loanSkipValidator,
  repaymentValidator,
};

