const { body, param, query } = require("express-validator");
const { validate } = require("../../auth/routes/auth.validator");
const rules = require("../../../utils/validation/fieldRules");

const CUSTOMER_TYPES = ["WALK_IN", "QR", "B2B", "REGULAR", "walk in", "qr", "WALK-IN", "Individual", "Company", "INDIVIDUAL", "COMPANY", "individual", "company"];
const CUSTOMER_SOURCES = ["INDIVIDUAL", "COMPANY", "individual", "company", "WALK_IN", "QR", "STAFF", "QR_CODE"];

// Rules shared by create and update. Every field here is optional; create adds the required ones.
const commonRules = [
  rules.mobileRule("phone", "Phone number", { required: false }),
  rules.emailRule("email", "Email", { required: false }),
  rules.gstinRule("gstin", "GSTIN"),
  rules.gstinRule("gstNumber", "GSTIN"),
  rules.businessNameRule("company", "Company name", { required: false }),
  rules.businessNameRule("companyName", "Company name", { required: false }),
  rules.safeTextRule("address", "Address", { max: 500 }),
  rules.safeTextRule("remarks", "Remarks", { max: 1000 }),
  rules.safeTextRule("notes", "Notes", { max: 1000 }),
  rules.amountRule("creditLimit", "Credit limit"),
  rules.objectIdRule("branchId", "Branch", { required: false }),
  body("customerType").optional({ values: "falsy" }).isIn(CUSTOMER_TYPES).withMessage("customerType must be a valid customer type"),
  body("customerSource").optional({ values: "falsy" }).isIn(CUSTOMER_SOURCES).withMessage("customerSource must be a valid customer source"),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
];

const createCustomerValidator = [
  rules.businessNameRule("name", "Customer name"),
  rules.mobileRule("mobile", "Customer mobile number"),
  ...commonRules,
  validate,
];

const updateCustomerValidator = [
  param("id").isMongoId().withMessage("Customer ID is not valid"),
  // A field that is sent must be valid; a field that is left out is not changed
  body("name")
    .optional()
    .customSanitizer((v) => String(v === null || v === undefined ? "" : v).trim().replace(/\s+/g, " "))
    .custom(rules.isBusinessName)
    .withMessage("Customer name must be 2-100 characters and may not be blank or contain special characters such as < > # $ % ^ * = { }."),
  body("mobile")
    .optional()
    .customSanitizer((v) => String(v === null || v === undefined ? "" : v).trim())
    .custom(rules.isMobile)
    .withMessage("Customer mobile number must be exactly 10 digits (numbers only)."),
  ...commonRules,
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
