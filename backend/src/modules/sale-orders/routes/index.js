/**
 * Routes Module: saleOrder (Branch -> Manufacturing Unit)
 */
const saleOrderRoutes = require("./saleOrder.routes");
const mfgRoutes = require("./mfg.routes");
const whatsappWebhookRoutes = require("./whatsappWebhook.routes");

module.exports = { saleOrderRoutes, mfgRoutes, whatsappWebhookRoutes };
