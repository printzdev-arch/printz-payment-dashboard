/**
 * Module: pos
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get index() {
      return require("./models/constants");
    },
  },
  controllers: {
    get saleReceipt() {
      return require("./controllers/saleReceipt.controller");
    },
  },
  dto: {
    get SaleDto() {
      return require("./models/SaleDto");
    },
    get SaleReceiptDto() {
      return require("./models/SaleReceiptDto");
    },
  },
  events: {
    get "posEvents.emitter"() {
      return require("./services/posEvents.emitter");
    },
  },
  helpers: {
    get "saleReceipt.helper"() {
      return require("./services/saleReceipt.helper");
    },
    get SaleReceiptHelper() {
      return require("./services/SaleReceiptHelper");
    },
  },
  models: {
    get Sale() {
      return require("./models/Sale");
    },
    get SaleReceipt() {
      return require("./models/SaleReceipt");
    },
    get SaleReceiptItem() {
      return require("./models/SaleReceiptItem");
    },
  },
  routes: {
    get saleReceipt() {
      return require("./routes/saleReceipt.routes");
    },
  },
  services: {
    get saleReceipt() {
      return require("./services/saleReceipt.service");
    },
  },
};
