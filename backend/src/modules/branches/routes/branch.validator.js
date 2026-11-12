const { body, param } = require("express-validator");
const { validate } = require("../../auth/routes/auth.validator");
const rules = require("../../../utils/validation/fieldRules");

const CODE_RE = /^[A-Z0-9-]{2,12}$/;
const CODE_MESSAGE = "Branch code must be 2-12 characters: letters, numbers or hyphens.";
const NAME_MESSAGE = "Branch name must be 2-100 characters and may not be blank or contain special characters such as < > # $ % ^ * = { }.";
const cleanText = (v) => String(v === null || v === undefined ? "" : v).trim().replace(/\s+/g, " ");

const optionalRules = [
  rules.mobileRule("phone", "Phone number", { required: false }),
  rules.safeTextRule("address", "Address", { max: 500 }),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false."),
];

const createBranchValidator = [
  rules.businessNameRule("name", "Branch name"),
  body("code")
    .customSanitizer((v) => cleanText(v).toUpperCase())
    .notEmpty()
    .withMessage("Branch code is required.")
    .bail()
    .matches(CODE_RE)
    .withMessage(CODE_MESSAGE),
  ...optionalRules,
  validate,
];

const updateBranchValidator = [
  param("id").isMongoId().withMessage("Branch ID is not valid."),
  body("name").optional().customSanitizer(cleanText).custom(rules.isBusinessName).withMessage(NAME_MESSAGE),
  body("code")
    .optional()
    .customSanitizer((v) => cleanText(v).toUpperCase())
    .matches(CODE_RE)
    .withMessage(CODE_MESSAGE),
  ...optionalRules,
  validate,
];

module.exports = { createBranchValidator, updateBranchValidator };
