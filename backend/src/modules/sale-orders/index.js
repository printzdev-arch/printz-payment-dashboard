/**
 * Module: sale-orders
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get saleOrder() {
      return require("./constants/saleOrder");
    },
  },
  controllers: {
    get saleOrder() {
      return require("./controllers/saleOrder.controller");
    },
    get whatsappWebhook() {
      return require("./controllers/whatsappWebhook.controller");
    },
  },
  models: {
    get MfgDesignAssignment() {
      return require("./models/MfgDesignAssignment");
    },
    get MfgDesignerProfile() {
      return require("./models/MfgDesignerProfile");
    },
    get SaleOrder() {
      return require("./models/SaleOrder");
    },
    get SaleOrderDesign() {
      return require("./models/SaleOrderDesign");
    },
    get SaleOrderEvent() {
      return require("./models/SaleOrderEvent");
    },
    get SaleOrderItem() {
      return require("./models/SaleOrderItem");
    },
    get SaleOrderPayment() {
      return require("./models/SaleOrderPayment");
    },
    get WhatsappMessage() {
      return require("./models/WhatsappMessage");
    },
  },
  routes: {
    get mfg() {
      return require("./routes/mfg.routes");
    },
    get saleOrder() {
      return require("./routes/saleOrder.routes");
    },
    get whatsappWebhook() {
      return require("./routes/whatsappWebhook.routes");
    },
  },
  services: {
    get "saleOrder.helpers"() {
      return require("./services/saleOrder.helpers");
    },
    get saleOrder() {
      return require("./services/saleOrder.service");
    },
    get saleOrderAssignment() {
      return require("./services/saleOrderAssignment.service");
    },
    get saleOrderScheduler() {
      return require("./services/saleOrderScheduler.service");
    },
    get saleOrderWhatsapp() {
      return require("./services/saleOrderWhatsapp.service");
    },
    get saleOrderWorkflow() {
      return require("./services/saleOrderWorkflow.service");
    },
  },
};
