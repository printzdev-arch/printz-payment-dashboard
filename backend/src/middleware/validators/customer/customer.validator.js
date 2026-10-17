const { body, param, query } = require("express-validator");
const { validate } = require("../auth/auth.validator");

const createCustomerValidator = [
  body("name")
    .notEmpty()
    .withMessage("Customer name is required")
    .isString()
    .trim(),
  body("mobile")
    .notEmpty()
    .withMessage("Customer mobile number is required")
    .isString()
    .trim(),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Invalid email address"),
  body("customerType")
    .optional()
    .isIn(["WALK_IN", "QR", "B2B", "REGULAR", "walk in", "qr", "WALK-IN", "Individual", "Company", "INDIVIDUAL", "COMPANY", "individual", "company"])
    .withMessage("customerType must be a valid customer type"),
  body("customerSource")
    .optional()
    .isIn(["INDIVIDUAL", "COMPANY", "individual", "company", "WALK_IN", "QR", "STAFF", "QR_CODE"])
    .withMessage("customerSource must be a valid customer source"),
  validate,
];

const updateCustomerValidator = [
  param("id")
    .notEmpty()
    .withMessage("Customer ID is required"),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Invalid email address"),
  body("customerType")
    .optional()
    .isIn(["WALK_IN", "QR", "B2B", "REGULAR", "walk in", "qr", "WALK-IN", "Individual", "Company", "INDIVIDUAL", "COMPANY", "individual", "company"])
    .withMessage("customerType must be a valid customer type"),
  body("customerSource")
    .optional()
    .isIn(["INDIVIDUAL", "COMPANY", "individual", "company", "WALK_IN", "QR", "STAFF", "QR_CODE"])
    .withMessage("customerSource must be a valid customer source"),
  validate,
];

const searchCustomerValidator = [
  query("q")
    .optional()
    .isString()
    .trim(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be an integer between 1 and 100"),
  validate,
];

module.exports = {
  createCustomerValidator,
  updateCustomerValidator,
  searchCustomerValidator,
};
