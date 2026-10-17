/**
 * API 04 - POS Checkout & Sale Receipt Validators
 */

const { body, param } = require("express-validator");

const checkoutValidator = [
  body("branchId").isMongoId().withMessage("Valid branchId is required."),
  body("items").isArray({ min: 1 }).withMessage("Items array must contain at least one item."),
  body("paymentMode").isIn(["CASH", "UPI", "CARD", "NET_BANKING", "CREDIT", "CHEQUE"]).withMessage("Invalid payment mode."),
];

module.exports = {
  checkoutValidator,
};
