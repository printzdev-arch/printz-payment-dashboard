const { body, param } = require("express-validator");
const { validate } = require("./auth.validator");

const createUserValidator = [
  body("employeeId")
    .notEmpty()
    .withMessage("employeeId is required")
    .isMongoId()
    .withMessage("Invalid employeeId format"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("username")
    .optional()
    .trim(),
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
  body("email")
    .optional()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
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
