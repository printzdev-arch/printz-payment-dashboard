const { body, param } = require("express-validator");
const { validate } = require("../../auth/routes/auth.validator");
const rules = require("../../../utils/validation/fieldRules");

const AGE_MESSAGE = `Date of birth must be a real date and the employee must be between ${rules.LIMITS.MIN_AGE} and ${rules.LIMITS.MAX_AGE} years old.`;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NO_RE = /^\d{9}$|^\d{10,18}$/;

// Checked on create and on update, only when the field is sent
const optionalRules = [
  rules.safeTextRule("address", "Address", { max: 500 }),
  rules.dateRule("joiningDate", "Joining date"),
  rules.dateRule("leavingDate", "Leaving date"),
  body("dateOfBirth").optional({ values: "falsy" }).custom(rules.isAdultDateOfBirth).withMessage(AGE_MESSAGE),
  body("employmentStatus").optional({ values: "falsy" }).isIn(["ACTIVE", "INACTIVE", "LEFT"]).withMessage("employmentStatus must be ACTIVE, INACTIVE or LEFT."),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false."),
  rules.objectIdRule("roleId", "Role", { required: false }),
  rules.objectIdRule("reportingManagerId", "Reporting manager", { required: false }),
  rules.amountRule("defaultSalary", "Default salary"),
  rules.personNameRule("bankDetails.accountHolderName", "Account holder name", { required: false }),
  body("bankDetails.ifscCode")
    .optional({ values: "falsy" })
    .customSanitizer((v) => String(v).trim().toUpperCase())
    .matches(IFSC_RE)
    .withMessage("IFSC code must be 11 characters, for example HDFC0001234."),
  body("bankDetails.accountNumber")
    .optional({ values: "falsy" })
    .customSanitizer((v) => String(v).trim())
    .matches(ACCOUNT_NO_RE)
    .withMessage("Account number must be 9 to 18 digits."),
];

const createEmployeeValidator = [
  rules.personNameRule("name", "Employee name"),
  rules.mobileRule("mobile", "Mobile number"),
  rules.emailRule("email", "Email"),
  rules.objectIdRule("branchId", "Branch"),
  ...optionalRules,
  validate,
];

const updateEmployeeValidator = [
  param("id").isMongoId().withMessage("Employee ID is not valid."),
  body("name")
    .optional()
    .customSanitizer((v) => String(v === null || v === undefined ? "" : v).trim().replace(/\s+/g, " "))
    .custom(rules.isPersonName)
    .withMessage("Employee name may contain only letters, spaces, apostrophes, hyphens and dots (2-100 characters)."),
  body("mobile")
    .optional()
    .customSanitizer((v) => String(v === null || v === undefined ? "" : v).trim())
    .custom(rules.isMobile)
    .withMessage("Mobile number must be exactly 10 digits (numbers only)."),
  body("email")
    .optional()
    .customSanitizer((v) => String(v === null || v === undefined ? "" : v).trim().toLowerCase())
    .custom(rules.isEmail)
    .withMessage("Email must be a valid email address (for example name@example.com)."),
  rules.objectIdRule("branchId", "Branch", { required: false }),
  ...optionalRules,
  validate,
];

const resetPasswordValidator = [
  param("id").isMongoId().withMessage("Employee ID is not valid."),
  rules.strongPasswordRule("password", "Password"),
  validate,
];

module.exports = { createEmployeeValidator, updateEmployeeValidator, resetPasswordValidator };
