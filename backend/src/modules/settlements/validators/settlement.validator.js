const { body, param, query, validationResult } = require("express-validator");
const ResponseHelper = require("../../../utils/ResponseHelper");

const validateRequest = (req, res, next) => {
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

const collectPaymentValidator = [
  param("id").isMongoId().withMessage("Invalid invoice ID format"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Payment amount must be a number greater than 0"),
  (req, res, next) => {
    const rawMode = req.body.paymentMode || req.body.paymentMethod || "CASH";
    const mode = String(rawMode).toUpperCase();
    const validModes = ["CASH", "CARD", "UPI", "BANK", "ONLINE", "CHEQUE", "CREDIT"];
    if (!validModes.includes(mode)) {
      return ResponseHelper.error(res, `paymentMode must be one of: ${validModes.join(", ")}`, 400, "VALIDATION_ERROR");
    }
    req.body.paymentMode = mode;
    req.body.paymentMethod = mode;
    if (!req.body.paymentReference && req.body.referenceNumber) {
      req.body.paymentReference = req.body.referenceNumber;
    }
    if (!req.body.remarks && req.body.notes) {
      req.body.remarks = req.body.notes;
    }
    next();
  },
  body("paymentReference")
    .optional({ nullable: true })
    .isString()
    .trim(),
  body("paymentDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("paymentDate must be a valid ISO8601 date string"),
  body("remarks")
    .optional({ nullable: true })
    .isString()
    .trim(),
  body("idempotencyKey")
    .optional({ nullable: true })
    .isString()
    .trim(),
  validateRequest,
];

const voidPaymentValidator = [
  param("id").isMongoId().withMessage("Invalid payment ID format"),
  body("reason")
    .notEmpty()
    .withMessage("Void reason is required")
    .isString()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Void reason must be at least 3 characters"),
  validateRequest,
];

const createReminderValidator = [
  param("id").isMongoId().withMessage("Invalid invoice ID format"),
  body("reminderType")
    .optional()
    .isIn(["DUE", "OVERDUE", "PAYMENT_FOLLOW_UP"])
    .withMessage("reminderType must be DUE, OVERDUE, or PAYMENT_FOLLOW_UP"),
  body("channel")
    .optional()
    .isIn(["EMAIL", "SMS", "WHATSAPP", "MANUAL"])
    .withMessage("channel must be EMAIL, SMS, WHATSAPP, or MANUAL"),
  body("scheduledAt")
    .optional()
    .isISO8601()
    .withMessage("scheduledAt must be a valid date"),
  body("remarks")
    .optional()
    .isString()
    .trim(),
  validateRequest,
];

const closeJobValidator = [
  param("id").isMongoId().withMessage("Invalid Job Order ID format"),
  body("remarks")
    .optional()
    .isString()
    .trim(),
  validateRequest,
];

const reopenJobValidator = [
  param("id").isMongoId().withMessage("Invalid Job Order ID format"),
  body("reason")
    .notEmpty()
    .withMessage("Reopening reason is required")
    .isString()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Reopening reason must be at least 3 characters"),
  validateRequest,
];

const feedbackValidator = [
  param("id").notEmpty().withMessage("Invalid Job Order ID"),
  body("rating")
    .isNumeric()
    .withMessage("Rating must be a number between 1 and 5"),
  body("comments")
    .optional()
    .isString()
    .trim(),
  body("feedback")
    .optional()
    .isString()
    .trim(),
  body("ratingDetails")
    .optional(),
  body("channel")
    .optional(),
  validateRequest,
];

module.exports = {
  collectPaymentValidator,
  voidPaymentValidator,
  createReminderValidator,
  closeJobValidator,
  reopenJobValidator,
  feedbackValidator,
};
