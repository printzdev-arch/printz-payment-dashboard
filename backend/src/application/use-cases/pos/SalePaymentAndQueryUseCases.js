const saleReceiptService = require("../../services/pos/saleReceipt.service");

class RecordReceiptPayment {
  constructor(service = saleReceiptService) {
    this.service = service;
  }

  async execute(id, dto, authContext = {}) {
    return this.service.recordPayment(id, dto, authContext);
  }
}

class GetSaleReceipts {
  constructor(service = saleReceiptService) {
    this.service = service;
  }

  async execute(filters = {}, pagination = {}, authContext = {}) {
    return this.service.getReceipts(filters, pagination, authContext);
  }
}

module.exports = {
  RecordReceiptPayment,
  GetSaleReceipts,
};
