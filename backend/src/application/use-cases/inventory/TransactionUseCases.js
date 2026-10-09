const inventoryService = require("../../services/inventory/inventory.service");
const inventoryTransactionService = require("../../services/inventory/inventoryTransaction.service");

class PostInventoryTransaction {
  constructor(service = inventoryService) {
    this.service = service;
  }

  async execute(params) {
    return this.service.post(params);
  }
}

class RecordOpeningStock {
  constructor(service = inventoryTransactionService) {
    this.service = service;
  }

  async execute(dto, authContext = {}) {
    return this.service.recordOpeningStock(dto, authContext);
  }
}

module.exports = {
  PostInventoryTransaction,
  RecordOpeningStock,
};
