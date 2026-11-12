const { body } = require("express-validator");
const { validate } = require("../../auth/routes/auth.validator");
const rules = require("../../../utils/validation/fieldRules");

// Money, quantity and tax rules for the lines of a job order (create, update, replace items, estimate)
const itemRules = [
  body("items").optional().isArray().withMessage("items must be an array"),
  rules.quantityRule("items.*.quantity", "Item quantity"),
  rules.quantityRule("items.*.qty", "Item quantity"),
  rules.amountRule("items.*.unitRate", "Item rate"),
  rules.amountRule("items.*.unitPrice", "Item rate"),
  rules.amountRule("items.*.rate", "Item rate"),
  rules.percentageRule("items.*.taxRate", "Item tax rate"),
  rules.amountRule("discountAmount", "Discount"),
];

const headerRules = [
  rules.quantityRule("quantity", "Quantity"),
  body("dueDate").optional({ nullable: true, checkFalsy: true }).custom(rules.isValidDate).withMessage("dueDate must be a valid date"),
  body("expectedDeliveryDate").optional({ nullable: true, checkFalsy: true }).custom(rules.isValidDate).withMessage("expectedDeliveryDate must be a valid date"),
  body("orderDate").optional({ nullable: true, checkFalsy: true }).custom(rules.isValidDate).withMessage("orderDate must be a valid date"),
  rules.amountRule("advancePaid", "Advance amount"),
  rules.amountRule("finishingServices.*.unitPrice", "Finishing rate"),
  body("finishingServices.*.quantity")
    .optional({ values: "null" })
    .if((v) => v !== "")
    .custom((v) => {
      const n = rules.toFiniteNumber(v);
      return n !== null && n >= 0 && n <= rules.LIMITS.MAX_QUANTITY;
    })
    .withMessage("Finishing quantity must be a number that is 0 or more."),
  rules.safeTextRule("title", "Title", { max: 200 }),
  rules.safeTextRule("jobTitle", "Title", { max: 200 }),
  rules.objectIdRule("customerId", "Customer", { required: false }),
  rules.emailRule("customerEmail", "Customer email", { required: false }),
  rules.emailRule("customerSnapshot.email", "Customer email", { required: false }),
];

// A new walk-in customer typed on the job form must have a proper name and mobile number. When an existing
// customer is picked (customerId), their saved details are used as they are.
const isNewCustomer = (_v, { req }) => !req.body || !req.body.customerId;
const newCustomerMobile = (field) =>
  body(field)
    .if(isNewCustomer)
    .optional({ values: "falsy" })
    .customSanitizer((v) => String(v).trim())
    .custom(rules.isMobile)
    .withMessage("Customer mobile number must be exactly 10 digits (numbers only).");
const newCustomerName = (field) =>
  body(field)
    .if(isNewCustomer)
    .optional({ values: "falsy" })
    .customSanitizer((v) => String(v).trim().replace(/\s+/g, " "))
    .custom(rules.isBusinessName)
    .withMessage("Customer name must be 2-100 characters and may not contain special characters such as < > # $ % ^ * = { }.");
const newCustomerRules = [
  newCustomerMobile("customerMobile"),
  newCustomerMobile("customerPhone"),
  newCustomerMobile("customerSnapshot.mobile"),
  newCustomerName("customerName"),
  newCustomerName("customerSnapshot.name"),
];

const createJobValidator = [
  rules.objectIdRule("branchId", "branchId"),
  ...headerRules,
  ...newCustomerRules,
  ...itemRules,
  validate,
];

const updateJobValidator = [
  rules.objectIdRule("branchId", "branchId", { required: false }),
  ...headerRules,
  ...itemRules,
  validate,
];

const replaceItemsValidator = [
  body("items").isArray().withMessage("items must be an array"),
  ...itemRules.slice(1),
  validate,
];

const estimateValidator = [
  body("items").isArray().withMessage("items must be an array of estimated line items"),
  ...itemRules.slice(1),
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
