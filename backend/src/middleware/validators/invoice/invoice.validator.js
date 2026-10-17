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

const createDraftValidator = [
  body("jobOrderId")
    .notEmpty().withMessage("jobOrderId is required")
    .isMongoId().withMessage("jobOrderId must be a valid Mongo ObjectId"),
  body("additionalCharges")
    .optional()
    .isArray().withMessage("additionalCharges must be an array"),
  body("additionalCharges.*.description")
    .optional()
    .isString().trim().notEmpty().withMessage("Charge description cannot be empty"),
  body("additionalCharges.*.amount")
    .optional()
    .isFloat({ min: 0 }).withMessage("Charge amount must be positive"),
  body("remarks")
    .optional()
    .isString().trim(),
  body("dueDate")
    .optional()
    .isISO8601().withMessage("dueDate must be a valid ISO8601 date string"),
  validate,
];

const updateDraftValidator = [
  param("id")
    .isMongoId().withMessage("id must be a valid Mongo ObjectId"),
  body("items")
    .optional()
    .isArray().withMessage("items must be an array"),
  body("items.*.quantity")
    .optional()
    .isFloat({ min: 0 }).withMessage("Item quantity must be >= 0"),
  body("items.*.unitPrice")
    .optional()
    .isFloat({ min: 0 }).withMessage("Item unitPrice must be >= 0"),
  body("additionalCharges")
    .optional()
    .isArray().withMessage("additionalCharges must be an array"),
  body("remarks")
    .optional()
    .isString().trim(),
  body("dueDate")
    .optional()
    .isISO8601().withMessage("dueDate must be a valid ISO8601 date string"),
  validate,
];

const calculateValidator = [
  param("id")
    .isMongoId().withMessage("id must be a valid Mongo ObjectId"),
  body("items")
    .optional()
    .isArray().withMessage("items must be an array"),
  body("additionalCharges")
    .optional()
    .isArray().withMessage("additionalCharges must be an array"),
  validate,
];

const submitApprovalValidator = [
  param("id")
    .isMongoId().withMessage("id must be a valid Mongo ObjectId"),
  body("comments")
    .optional()
    .isString().trim(),
  validate,
];

const approveVarianceValidator = [
  param("id")
    .isMongoId().withMessage("id must be a valid Mongo ObjectId"),
  body("decision")
    .optional()
    .isIn(["APPROVED", "REJECTED"]).withMessage("decision must be APPROVED or REJECTED"),
  body("remarks")
    .optional()
    .isString().trim(),
  validate,
];

const shareValidator = [
  param("id")
    .isMongoId().withMessage("id must be a valid Mongo ObjectId"),
  body("channel")
    .optional()
    .isIn(["EMAIL", "WHATSAPP", "SMS"]).withMessage("channel must be EMAIL, WHATSAPP, or SMS"),
  body("recipient")
    .optional()
    .isString().trim().notEmpty().withMessage("recipient cannot be empty"),
  validate,
];

module.exports = {
  createDraftValidator,
  updateDraftValidator,
  calculateValidator,
  submitApprovalValidator,
  approveVarianceValidator,
  shareValidator,
};
