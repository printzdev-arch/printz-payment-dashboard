/**
 * DTO Module: pos
 */
const SaleReceiptDto = require("./SaleReceiptDto");
const SaleDto = require("./SaleDto");

module.exports = {
  ...SaleReceiptDto,
  ...SaleDto,
  SaleReceiptDto,
  SaleDto,
};
