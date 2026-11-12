/**
 * API 03 - Inventory Master & Ledger Validators
 */

const { body } = require("express-validator");
const { validate } = require("../../auth/routes/auth.validator");
const rules = require("../../../utils/validation/fieldRules");

const cleanText = (v) => String(v === null || v === undefined ? "" : v).trim().replace(/\s+/g, " ");

// A stock adjustment may add or remove stock, so it is the one quantity that can be negative. Never zero.
const isAdjustmentQuantity = (v) => {
  const n = rules.toFiniteNumber(v);
  return n !== null && n !== 0 && Math.abs(n) <= rules.LIMITS.MAX_QUANTITY;
};

const itemFieldRules = [
  body("category").optional({ values: "falsy" }).isString().trim(),
  body("hsnCode")
    .optional({ values: "falsy" })
    .customSanitizer((v) => String(v).trim())
    .matches(/^\d{4,8}$/)
    .withMessage("HSN code must be 4 to 8 digits."),
  rules.amountRule("purchaseRate", "Purchase rate"),
  rules.amountRule("saleRate", "Sale rate"),
  rules.percentageRule("taxRate", "Tax rate"),
  rules.amountRule("reorderLevel", "Reorder level", { max: rules.LIMITS.MAX_QUANTITY }),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false."),
  body("isStockTracked").optional().isBoolean().withMessage("isStockTracked must be true or false."),
];

const createInventoryItemValidator = [
  body("itemCode")
    .customSanitizer((v) => cleanText(v).toUpperCase())
    .notEmpty()
    .withMessage("itemCode is required.")
    .bail()
    .matches(/^[A-Z0-9][A-Z0-9 ._/-]{0,39}$/)
    .withMessage("itemCode may contain only letters, numbers, spaces, dot, underscore, slash or hyphen (max 40)."),
  body("name")
    .customSanitizer(cleanText)
    .notEmpty()
    .withMessage("Item name is required.")
    .bail()
    .custom((v) => rules.isSafeText(v) && v.length <= 150)
    .withMessage("Item name must be at most 150 characters without < or >."),
  body("unit").customSanitizer(cleanText).notEmpty().withMessage("Unit is required."),
  ...itemFieldRules,
  validate,
];

const updateInventoryItemValidator = [
  body("name")
    .optional()
    .customSanitizer(cleanText)
    .custom((v) => v.length > 0 && rules.isSafeText(v) && v.length <= 150)
    .withMessage("Item name must be 1-150 characters without < or >."),
  body("unit").optional().customSanitizer(cleanText).notEmpty().withMessage("Unit cannot be blank."),
  ...itemFieldRules,
  validate,
];

const postOpeningStockValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("lines").isArray({ min: 1 }).withMessage("At least one inventory line is required."),
  body("lines.*.itemId").isMongoId().withMessage("Valid itemId is required for each line."),
  rules.quantityRule("lines.*.quantity", "Quantity", { required: true }),
  validate,
];

const postAdjustmentValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("itemId").isMongoId().withMessage("Valid itemId is required."),
  body("quantity").custom(isAdjustmentQuantity).withMessage("Quantity must be a number other than 0 (a negative number removes stock)."),
  body("notes").customSanitizer(cleanText).notEmpty().withMessage("notes is required for stock adjustments."),
  validate,
];

const postIssueValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("itemId").isMongoId().withMessage("Valid itemId is required."),
  rules.quantityRule("quantity", "Quantity", { required: true }),
  body("consumptionType")
    .optional({ values: "falsy" })
    .isIn(["PRINTING_ASSET", "PAPER", "INK_TONER", "OTHER_CONSUMABLE"])
    .withMessage("Invalid consumptionType."),
  validate,
];

const purchaseReceiptItemRules = [
  body("items.*.itemId").isMongoId().withMessage("Valid itemId is required for each item."),
  rules.quantityRule("items.*.quantity", "Item quantity", { required: true }),
  rules.amountRule("items.*.purchaseRate", "Purchase rate", { required: true }),
  rules.amountRule("items.*.amount", "Item amount"),
];

const purchaseReceiptValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("supplierName")
    .customSanitizer(cleanText)
    .notEmpty()
    .withMessage("supplierName is required.")
    .bail()
    .custom(rules.isSafeText)
    .withMessage("supplierName may not contain < or >."),
  rules.dateRule("receivedDate", "Received date"),
  body("items").isArray({ min: 1 }).withMessage("At least one item is required."),
  ...purchaseReceiptItemRules,
  validate,
];

const updatePurchaseReceiptValidator = [
  body("supplierName")
    .optional()
    .customSanitizer(cleanText)
    .custom((v) => v.length > 0 && rules.isSafeText(v))
    .withMessage("supplierName cannot be blank or contain < or >."),
  rules.dateRule("receivedDate", "Received date"),
  body("items").optional().isArray({ min: 1 }).withMessage("At least one item is required."),
  ...purchaseReceiptItemRules,
  validate,
];

module.exports = {
  createInventoryItemValidator,
  updateInventoryItemValidator,
  postOpeningStockValidator,
  postAdjustmentValidator,
  postIssueValidator,
  purchaseReceiptValidator,
  updatePurchaseReceiptValidator,
};
