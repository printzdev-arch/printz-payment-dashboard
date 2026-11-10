/**
 * Module: inventory
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get index() {
      return require("./models/constants");
    },
  },
  controllers: {
    get inventoryBalance() {
      return require("./controllers/inventoryBalance.controller");
    },
    get inventoryItem() {
      return require("./controllers/inventoryItem.controller");
    },
    get inventoryTransaction() {
      return require("./controllers/inventoryTransaction.controller");
    },
    get purchaseReceipt() {
      return require("./controllers/purchaseReceipt.controller");
    },
  },
  dto: {
    get InventoryDto() {
      return require("./models/InventoryDto");
    },
  },
  events: {
    get "inventoryEvents.listener"() {
      return require("./services/inventoryEvents.listener");
    },
  },
  helpers: {
    get InventoryHelper() {
      return require("./services/InventoryHelper");
    },
    get inventoryMigration() {
      return require("./services/inventoryMigration");
    },
  },
  models: {
    get InventoryBalance() {
      return require("./models/InventoryBalance");
    },
    get InventoryItem() {
      return require("./models/InventoryItem");
    },
    get InventoryMovement() {
      return require("./models/InventoryMovement");
    },
    get InventoryTransaction() {
      return require("./models/InventoryTransaction");
    },
    get Product() {
      return require("./models/Product");
    },
    get PurchaseReceipt() {
      return require("./models/PurchaseReceipt");
    },
  },
  routes: {
    get inventoryBalance() {
      return require("./routes/inventoryBalance.routes");
    },
    get inventoryItem() {
      return require("./routes/inventoryItem.routes");
    },
    get inventoryTransaction() {
      return require("./routes/inventoryTransaction.routes");
    },
    get purchaseReceipt() {
      return require("./routes/purchaseReceipt.routes");
    },
  },
  services: {
    get inventory() {
      return require("./services/inventory.service");
    },
    get inventoryBalance() {
      return require("./services/inventoryBalance.service");
    },
    get inventoryItem() {
      return require("./services/inventoryItem.service");
    },
    get inventoryTransaction() {
      return require("./services/inventoryTransaction.service");
    },
    get purchaseReceipt() {
      return require("./services/purchaseReceipt.service");
    },
  },
};
