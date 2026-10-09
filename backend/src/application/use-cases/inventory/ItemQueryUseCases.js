const inventoryItemService = require("../../services/inventory/inventoryItem.service");

class GetInventoryItems {
  constructor(service = inventoryItemService) {
    this.service = service;
  }

  async execute(filters = {}, pagination = {}, authContext = {}) {
    return this.service.getItems(filters, pagination, authContext);
  }
}

class UpdateInventoryItem {
  constructor(service = inventoryItemService) {
    this.service = service;
  }

  async execute(id, updateData = {}, authContext = {}) {
    return this.service.updateItem(id, updateData, authContext);
  }
}

module.exports = {
  GetInventoryItems,
  UpdateInventoryItem,
};
