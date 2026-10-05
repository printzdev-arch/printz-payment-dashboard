const { body, param } = require("express-validator");
const { validate } = require("./auth.validator");

const createUserValidator = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),
  body("role")
    .isIn(["admin", "manager"])
    .withMessage("Role must be either 'admin' or 'manager'"),
  body("branch")
    .optional()
    .trim(),
  body("location")
    .optional()
    .trim(),
  body("phone")
    .optional()
    .trim(),
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
    .isIn(["admin", "manager"])
    .withMessage("Role must be either 'admin' or 'manager'"),
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
