const inventoryItemService = require("../../services/inventory/inventoryItem.service");

class CreateInventoryItem {
  constructor(service = inventoryItemService) {
    this.service = service;
  }

  async execute(dto, authContext = {}) {
    return this.service.createItem(dto, authContext);
  }
}

module.exports = CreateInventoryItem;
