const saleReceiptService = require("../../services/pos/saleReceipt.service");

class CompleteSaleReceipt {
  constructor(service = saleReceiptService) {
    this.service = service;
  }

  async execute(id, authContext = {}) {
    return this.service.completeReceipt(id, authContext);
  }
}

class CheckoutSaleReceipt {
  constructor(service = saleReceiptService) {
    this.service = service;
  }

  async execute(dto, authContext = {}) {
    return this.service.checkout(dto, authContext);
  }
}

class VoidSaleReceipt {
  constructor(service = saleReceiptService) {
    this.service = service;
  }

  async execute(id, data = {}, authContext = {}) {
    return this.service.voidReceipt(id, data, authContext);
  }
}

module.exports = {
  CompleteSaleReceipt,
  CheckoutSaleReceipt,
  VoidSaleReceipt,
};
