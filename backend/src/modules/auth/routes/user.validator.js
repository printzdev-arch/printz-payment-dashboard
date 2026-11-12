const { body, param } = require("express-validator");
const { validate } = require("./auth.validator");
const rules = require("../../../utils/validation/fieldRules");

const NAME_MESSAGE = "Name may contain only letters, spaces, apostrophes, hyphens and dots (2-100 characters).";
const cleanName = (v) => String(v === null || v === undefined ? "" : v).trim().replace(/\s+/g, " ");

const createUserValidator = [
  // Optional: staff accounts link to an employee; admin accounts are standalone
  body("employeeId")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid employeeId format"),
  body("name")
    .if(body("employeeId").not().exists({ checkFalsy: true }))
    .customSanitizer(cleanName)
    .notEmpty()
    .withMessage("Name is required when no employee is selected")
    .bail()
    .custom(rules.isPersonName)
    .withMessage(NAME_MESSAGE),
  // When an employee is selected the name comes from the employee; a name that is sent anyway must still be valid
  body("name")
    .if(body("employeeId").exists({ checkFalsy: true }))
    .optional({ values: "falsy" })
    .customSanitizer(cleanName)
    .custom(rules.isPersonName)
    .withMessage(NAME_MESSAGE),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .custom(rules.isEmail)
    .withMessage("Valid email is required")
    .normalizeEmail(),
  rules.strongPasswordRule("password", "Password"),
  body("username")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^[A-Za-z0-9._-]{3,40}$/)
    .withMessage("Username must be 3-40 characters: letters, numbers, dot, underscore or hyphen."),
  rules.mobileRule("phone", "Phone number", { required: false }),
  body("sendInvite")
    .optional()
    .isBoolean()
    .withMessage("sendInvite must be a boolean"),
  validate,
];

const updateUserValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("User ID is required"),
  body("name").optional().customSanitizer(cleanName).custom(rules.isPersonName).withMessage(NAME_MESSAGE),
  body("email")
    .optional()
    .custom(rules.isEmail)
    .withMessage("Valid email is required")
    .normalizeEmail(),
  rules.strongPasswordRule("password", "Password", { required: false }),
  rules.mobileRule("phone", "Phone number", { required: false }),
  body("role")
    .optional()
    .isString(),
  body("roleIds")
    .optional()
    .isArray(),
  body("branchIds")
    .optional()
    .isArray(),
  body("permissions")
    .optional()
    .isObject()
    .withMessage("Permissions must be an object"),
  validate,
];

module.exports = {
  createUserValidator,
  updateUserValidator,
};
