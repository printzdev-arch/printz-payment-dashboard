/**
 * API 03 - Inventory Master & Ledger Validators
 */

const { body, query, param } = require("express-validator");

const createInventoryItemValidator = [
  body("itemCode").trim().notEmpty().withMessage("itemCode is required."),
  body("name").trim().notEmpty().withMessage("Item name is required."),
  body("unit").trim().notEmpty().withMessage("Unit is required."),
  body("category").optional().isString().trim(),
  body("hsnCode").optional().isString().trim(),
  body("purchaseRate").optional().isNumeric().withMessage("purchaseRate must be numeric."),
  body("saleRate").optional().isNumeric().withMessage("saleRate must be numeric."),
  body("taxRate").optional().isNumeric().withMessage("taxRate must be numeric."),
  body("reorderLevel").optional().isNumeric().withMessage("reorderLevel must be numeric."),
];

const postOpeningStockValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("lines").isArray({ min: 1 }).withMessage("At least one inventory line is required."),
  body("lines.*.itemId").isMongoId().withMessage("Valid itemId is required for each line."),
  body("lines.*.quantity").isNumeric().withMessage("Quantity must be a positive number for each line."),
];

const postAdjustmentValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("itemId").isMongoId().withMessage("Valid itemId is required."),
  body("quantity").notEmpty().withMessage("quantity is required."),
  body("notes").trim().notEmpty().withMessage("notes is required for stock adjustments."),
];

const postIssueValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("itemId").isMongoId().withMessage("Valid itemId is required."),
  body("quantity").notEmpty().withMessage("quantity is required."),
  body("consumptionType")
    .optional()
    .isIn(["PRINTING_ASSET", "PAPER", "INK_TONER", "OTHER_CONSUMABLE"])
    .withMessage("Invalid consumptionType."),
];

const purchaseReceiptValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("supplierName").trim().notEmpty().withMessage("supplierName is required."),
  body("items").isArray({ min: 1 }).withMessage("At least one item is required."),
  body("items.*.itemId").isMongoId().withMessage("Valid itemId is required for each item."),
  body("items.*.quantity").isNumeric().withMessage("Valid quantity is required."),
  body("items.*.purchaseRate").isNumeric().withMessage("Valid purchaseRate is required."),
];

module.exports = {
  createInventoryItemValidator,
  postOpeningStockValidator,
  postAdjustmentValidator,
  postIssueValidator,
  purchaseReceiptValidator,
};

