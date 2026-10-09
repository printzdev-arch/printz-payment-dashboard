/**
 * API 05 - Product Order & Stock Transfer Validators
 */

const { body, param } = require("express-validator");

const createProductOrderValidator = [
  body("requestingBranchId").isMongoId().withMessage("Valid requestingBranchId is required."),
  body("items").isArray({ min: 1 }).withMessage("Items array must contain at least one item."),
];

module.exports = {
  createProductOrderValidator,
};
