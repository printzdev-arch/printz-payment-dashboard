/**
 * Models Module: invoice
 */
const Invoice = require("./Invoice");
const InvoiceReminder = require("./InvoiceReminder");
const PaymentToBeCollected = require("./PaymentToBeCollected");
const Payment = require("./Payment");

module.exports = {
  Invoice,
  InvoiceReminder,
  PaymentToBeCollected,
  Payment,
};
