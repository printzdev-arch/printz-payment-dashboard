const { body, param, query, validationResult } = require("express-validator");
const ResponseHelper = require("../../../utils/ResponseHelper");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));
    return ResponseHelper.error(
      res,
      "Validation failed. Please check your inputs.",
      400,
      "VALIDATION_ERROR",
      errorDetails
    );
  }
  next();
};

const idParamValidator = (paramName = "id") => [
  param(paramName).notEmpty().withMessage(`${paramName} is required`),
  validate,
];

// At least one of the given body fields must be a non-empty value
const requireAnyOf = (fields, message) =>
  body().custom((_, { req }) => {
    const data = req.body || {};
    return fields.some((f) => String(data[f] ?? "").trim().length > 0);
  }).withMessage(message);

const planProductionValidator = [
  param("id").notEmpty().withMessage("Job Order or Production Order ID is required"),
  validate,
];

const updateProductionOrderValidator = [
  param("id").notEmpty().withMessage("Production Order ID is required"),
  validate,
];

// Resume only needs the id (reason is optional)
const holdResumeCancelValidator = [
  param("id").notEmpty().withMessage("Production Order ID is required"),
  validate,
];

// Hold and cancel require a reason
const holdCancelReasonValidator = [
  param("id").notEmpty().withMessage("Production Order ID is required"),
  requireAnyOf(["reason"], "A reason is required"),
  validate,
];

const assignOperationValidator = [
  param("id").notEmpty().withMessage("Operation ID is required"),
  validate,
];

const startOperationValidator = [
  param("id").notEmpty().withMessage("Operation ID is required"),
  validate,
];

const pauseOperationValidator = [
  param("id").notEmpty().withMessage("Operation ID is required"),
  requireAnyOf(["reason", "remarks"], "A reason is required to pause an operation"),
  validate,
];

const skipOperationValidator = [
  param("id").notEmpty().withMessage("Operation ID is required"),
  requireAnyOf(["reason", "remarks"], "A reason is required to skip an operation"),
  validate,
];

const completeOperationValidator = [
  param("id").notEmpty().withMessage("Operation ID is required"),
  validate,
];

const qualityCheckValidator = [
  param("id").notEmpty().withMessage("Production Order ID is required"),
  body("result")
    .notEmpty()
    .withMessage("QC result is required")
    .isIn(["PASS", "ISSUE", "FAIL", "CONDITIONAL"])
    .withMessage("Result must be PASS, ISSUE, FAIL, or CONDITIONAL"),
  validate,
];

const reprintRequestValidator = [
  param("id").notEmpty().withMessage("Job Order ID is required"),
  body("reason").notEmpty().withMessage("Reason for reprint is required"),
  body("quantity")
    .notEmpty()
    .withMessage("Reprint quantity is required")
    .isFloat({ gt: 0 })
    .withMessage("Reprint quantity must be greater than zero"),
  validate,
];

const rejectReprintValidator = [
  param("id").notEmpty().withMessage("Reprint request ID is required"),
  requireAnyOf(["rejectionReason", "comments", "reason"], "A rejection reason is required"),
  validate,
];

const deliveryDeliverValidator = [
  param("id").notEmpty().withMessage("Delivery Order ID is required"),
  validate,
];

module.exports = {
  validate,
  idParamValidator,
  planProductionValidator,
  updateProductionOrderValidator,
  holdResumeCancelValidator,
  holdCancelReasonValidator,
  assignOperationValidator,
  startOperationValidator,
  pauseOperationValidator,
  skipOperationValidator,
  completeOperationValidator,
  qualityCheckValidator,
  reprintRequestValidator,
  rejectReprintValidator,
  deliveryDeliverValidator,
};