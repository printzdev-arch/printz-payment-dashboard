const saleReceiptService = require("../../services/pos/saleReceipt.service");

class CreateSaleReceipt {
  constructor(service = saleReceiptService) {
    this.service = service;
  }

  async execute(dto, authContext = {}) {
    return this.service.createDraft(dto, authContext);
  }
}

module.exports = CreateSaleReceipt;
