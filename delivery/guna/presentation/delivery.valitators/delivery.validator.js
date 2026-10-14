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
  param(paramName).isMongoId().withMessage(`Valid ${paramName} is required`),
  validate,
];

const createDeliveryOrderValidator = [
  body("jobOrderId").notEmpty().withMessage("jobOrderId is required"),
  body("deliveryType")
    .optional()
    .isIn(["DELIVERY", "COUNTER_PICKUP", "COURIER"])
    .withMessage("deliveryType must be DELIVERY, COUNTER_PICKUP, or COURIER"),
  validate,
];

const updateDeliveryDetailsValidator = [
  param("id").isMongoId().withMessage("Valid Delivery Order ID is required"),
  body("deliveryType")
    .optional()
    .isIn(["DELIVERY", "COUNTER_PICKUP", "COURIER"])
    .withMessage("deliveryType must be DELIVERY, COUNTER_PICKUP, or COURIER"),
  validate,
];

const reviewJobValidator = [
  param("jobOrderId").isMongoId().withMessage("Valid Job Order ID is required"),
  validate,
];

const assignDeliveryValidator = [
  param("id").isMongoId().withMessage("Valid Delivery Order ID is required"),
  body("deliveryPersonName")
    .optional()
    .isString()
    .withMessage("deliveryPersonName must be a string"),
  body("deliveryPersonPhone")
    .optional()
    .isString()
    .withMessage("deliveryPersonPhone must be a string"),
  body("assignedEmployeeId")
    .optional()
    .isMongoId()
    .withMessage("Valid assignedEmployeeId is required"),
  body("vehicleNumber")
    .optional()
    .isString()
    .withMessage("vehicleNumber must be a string"),
  validate,
];

const packDeliveryValidator = [
  param("id").isMongoId().withMessage("Valid Delivery Order ID is required"),
  body("packedQuantity")
    .optional()
    .isNumeric()
    .withMessage("packedQuantity must be a number"),
  body("quantity")
    .optional()
    .isNumeric()
    .withMessage("quantity must be a number"),
  validate,
];

const dispatchDeliveryValidator = [
  param("id").isMongoId().withMessage("Valid Delivery Order ID is required"),
  body("deliveryType")
    .optional()
    .isIn(["DELIVERY", "COUNTER_PICKUP", "COURIER"])
    .withMessage("deliveryType must be DELIVERY, COUNTER_PICKUP, or COURIER"),
  validate,
];

const recordHandoverValidator = [
  param("id").isMongoId().withMessage("Valid Delivery Order ID is required"),
  body("recipientName")
    .optional()
    .isString()
    .withMessage("recipientName must be a string"),
  body("receivedBy")
    .optional()
    .isString()
    .withMessage("receivedBy must be a string"),
  validate,
];

const deliverValidator = [
  param("id").isMongoId().withMessage("Valid Delivery Order ID is required"),
  body("receivedBy")
    .optional()
    .isString()
    .withMessage("receivedBy must be a string"),
  body("remarks")
    .optional()
    .isString()
    .withMessage("remarks must be a string"),
  validate,
];

const verifyOtpValidator = [
  param("id").isMongoId().withMessage("Valid Delivery Order ID is required"),
  body("otp").notEmpty().withMessage("OTP is required"),
  validate,
];

module.exports = {
  validate,
  idParamValidator,
  createDeliveryOrderValidator,
  updateDeliveryDetailsValidator,
  reviewJobValidator,
  assignDeliveryValidator,
  packDeliveryValidator,
  dispatchDeliveryValidator,
  recordHandoverValidator,
  deliverValidator,
  verifyOtpValidator,
};

