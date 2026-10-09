const CreateSaleReceipt = require("./CreateSaleReceipt");
const {
  CompleteSaleReceipt,
  CheckoutSaleReceipt,
  VoidSaleReceipt,
} = require("./SaleReceiptActionUseCases");
const {
  RecordReceiptPayment,
  GetSaleReceipts,
} = require("./SalePaymentAndQueryUseCases");

module.exports = {
  CreateSaleReceipt,
  CompleteSaleReceipt,
  CheckoutSaleReceipt,
  VoidSaleReceipt,
  RecordReceiptPayment,
  GetSaleReceipts,
};
