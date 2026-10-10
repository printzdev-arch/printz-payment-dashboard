const { body, query } = require("express-validator");
const { validate } = require("../auth.validator");

const FORBIDDEN_PRIVILEGED_FIELDS = [
  "status",
  "stage",
  "currentStage",
  "discount",
  "discountAmount",
  "subtotal",
  "taxAmount",
  "grandTotal",
  "estimatedPrice",
  "totalAmount",
  "paymentStatus",
  "designerId",
  "estimationStatus",
  "createdBy",
  "assignedAt",
  "permissions",
  "role",
  "creditLimit",
  "outstandingBalance",
];

const publicJobRequestValidator = [
  // 1. Guard against privileged fields
  body().custom((reqBody) => {
    if (!reqBody || typeof reqBody !== "object") return true;
    for (const field of FORBIDDEN_PRIVILEGED_FIELDS) {
      if (reqBody[field] !== undefined) {
        throw new Error(
          `Unauthorized field '${field}': Public requests cannot submit internal or privileged values.`
        );
      }
    }
    return true;
  }),

  // 2. Validate branchCode (either in body or in query)
  body().custom((reqBody, { req }) => {
    const code = reqBody?.branchCode || reqBody?.branch || req.query?.branchCode || req.query?.branch;
    if (!code || typeof code !== "string" || !code.trim()) {
      throw new Error("branchCode is required to identify the authorized branch.");
    }
    return true;
  }),

  // 3. Customer validation
  body().custom((reqBody) => {
    const name = reqBody?.customerName || reqBody?.name;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("Customer name (customerName or name) is required.");
    }
    const mobile = reqBody?.customerPhone || reqBody?.mobile || reqBody?.phone;
    if (!mobile || typeof mobile !== "string" || !mobile.trim()) {
      throw new Error("Customer phone number (customerPhone or mobile) is required.");
    }
    const digitsOnly = mobile.replace(/\D/g, "");
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      throw new Error("Customer phone number must contain between 7 and 15 digits.");
    }
    return true;
  }),

  // 4. Quantity validation if supplied
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer greater than or equal to 1."),

  // 5. Due date validation if supplied
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("dueDate must be a valid ISO8601 date string."),

  validate,
];

module.exports = {
  publicJobRequestValidator,
  FORBIDDEN_PRIVILEGED_FIELDS,
};
