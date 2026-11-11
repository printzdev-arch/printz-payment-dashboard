/**
 * Services Module: saleOrder (Branch -> Manufacturing Unit)
 */
const saleOrderService = require("./saleOrder.service");
const saleOrderWorkflowService = require("./saleOrderWorkflow.service");
const saleOrderMfgService = require("./saleOrderMfg.service");
const saleOrderWhatsappService = require("./saleOrderWhatsapp.service");
const saleOrderSchedulerService = require("./saleOrderScheduler.service");
const helpers = require("./saleOrder.helpers");

module.exports = {
  saleOrderService,
  saleOrderWorkflowService,
  saleOrderMfgService,
  saleOrderWhatsappService,
  saleOrderSchedulerService,
  getActor: helpers.getActor,
};
