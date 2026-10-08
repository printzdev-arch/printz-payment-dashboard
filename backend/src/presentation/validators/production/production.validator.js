const { body, param, query, validationResult } = require("express-validator");
const ResponseHelper = require("../../../shared/response/ResponseHelper");

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

const planProductionValidator = [
  param("id").notEmpty().withMessage("Job Order ID is required"),
  validate,
];

const updateProductionOrderValidator = [
  param("id").notEmpty().withMessage("Production Order ID is required"),
  validate,
];

const holdResumeCancelValidator = [
  param("id").notEmpty().withMessage("Production Order ID is required"),
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
  body("quantity").notEmpty().withMessage("Reprint quantity is required"),
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
  assignOperationValidator,
  startOperationValidator,
  completeOperationValidator,
  qualityCheckValidator,
  reprintRequestValidator,
  deliveryDeliverValidator,
};
