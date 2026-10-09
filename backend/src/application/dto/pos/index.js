/**
 * API 04 - POS & Sales DTOs
 */

const SaleReceiptDto = require("../SaleReceiptDto");
const SaleDto = require("../SaleDto");
const PaymentDto = require("../PaymentDto");

module.exports = {
  ...SaleReceiptDto,
  ...SaleDto,
  ...PaymentDto,
};
