/**
 * DTO Module: invoice
 */
const InvoiceDto = require("./InvoiceDto");
const PaymentDto = require("./PaymentDto");

module.exports = {
  ...InvoiceDto,
  ...PaymentDto,
  InvoiceDto,
  PaymentDto,
};
