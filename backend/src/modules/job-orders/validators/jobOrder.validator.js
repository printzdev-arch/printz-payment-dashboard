const { body } = require("express-validator");
const { validate } = require("../../auth/validators/auth.validator");

const createJobValidator = [
  body("branchId").notEmpty().withMessage("branchId is required"),
  body("quantity").optional({ nullable: true }).isFloat({ gt: 0 }).withMessage("quantity must be greater than 0"),
  body("dueDate").optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage("dueDate must be a valid date"),
  body("items").optional().isArray().withMessage("items must be an array"),
  body("items.*.quantity").optional().isFloat({ gt: 0 }).withMessage("item quantity must be greater than 0"),
  body("items.*.unitPrice").optional().isFloat({ min: 0 }).withMessage("item unitPrice cannot be negative"),
  validate,
];

const updateJobValidator = [
  body("quantity").optional({ nullable: true }).isFloat({ gt: 0 }).withMessage("quantity must be greater than 0"),
  body("dueDate").optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage("dueDate must be a valid date"),
  body("items").optional().isArray().withMessage("items must be an array"),
  body("items.*.quantity").optional().isFloat({ gt: 0 }).withMessage("item quantity must be greater than 0"),
  body("items.*.unitPrice").optional().isFloat({ min: 0 }).withMessage("item unitPrice cannot be negative"),
  validate,
];

const replaceItemsValidator = [
  body("items").isArray().withMessage("items must be an array"),
  validate,
];

const estimateValidator = [
  body("items").isArray().withMessage("items must be an array of estimated line items"),
  validate,
];

const approveEstimateValidator = [
  validate,
];

const rejectEstimateValidator = [
  validate,
];

const holdCancelValidator = [
  validate,
];

const fileUploadValidator = [
  body("fileName").notEmpty().withMessage("fileName is required"),
  validate,
];

module.exports = {
  createJobValidator,
  updateJobValidator,
  replaceItemsValidator,
  estimateValidator,
  approveEstimateValidator,
  rejectEstimateValidator,
  holdCancelValidator,
  fileUploadValidator,
};
