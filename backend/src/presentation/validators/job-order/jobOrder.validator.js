const { body } = require("express-validator");
const { validate } = require("../auth.validator");

const createJobValidator = [
  body("branchId").notEmpty().withMessage("branchId is required"),
  validate,
];

const updateJobValidator = [
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

const skipDesignValidator = [
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
  skipDesignValidator,
  holdCancelValidator,
  fileUploadValidator,
};
