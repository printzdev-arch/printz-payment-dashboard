const purchaseReceiptService = require("../../services/inventory/purchaseReceipt.service");
const inventoryBalanceService = require("../../services/inventory/inventoryBalance.service");

class CreatePurchaseReceipt {
  constructor(service = purchaseReceiptService) {
    this.service = service;
  }

  async execute(dto, authContext = {}) {
    return this.service.createDraft(dto, authContext);
  }
}

class PostPurchaseReceipt {
  constructor(service = purchaseReceiptService) {
    this.service = service;
  }

  async execute(id, authContext = {}) {
    return this.service.postReceipt(id, authContext);
  }
}

class GetInventoryBalances {
  constructor(service = inventoryBalanceService) {
    this.service = service;
  }

  async execute(filters = {}, pagination = {}, authContext = {}) {
    return this.service.getBalances(filters, pagination, authContext);
  }
}

module.exports = {
  CreatePurchaseReceipt,
  PostPurchaseReceipt,
  GetInventoryBalances,
};
