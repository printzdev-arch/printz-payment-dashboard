const { body, param, query } = require("express-validator");
const { validate } = require("../auth.validator");

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
    .isIn(["WALK_IN", "B2B", "REGULAR"])
    .withMessage("customerType must be one of: WALK_IN, B2B, REGULAR"),
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
    .isIn(["WALK_IN", "B2B", "REGULAR"])
    .withMessage("customerType must be one of: WALK_IN, B2B, REGULAR"),
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
