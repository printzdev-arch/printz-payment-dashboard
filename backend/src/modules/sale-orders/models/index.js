/**
 * Models Module: saleOrder (Branch -> Manufacturing Unit)
 */
const SaleOrder = require("./SaleOrder");
const SaleOrderItem = require("./SaleOrderItem");
const SaleOrderPayment = require("./SaleOrderPayment");
const SaleOrderEvent = require("./SaleOrderEvent");
const SaleOrderDesign = require("./SaleOrderDesign");
const WhatsappMessage = require("./WhatsappMessage");

module.exports = {
  SaleOrder,
  SaleOrderItem,
  SaleOrderPayment,
  SaleOrderEvent,
  SaleOrderDesign,
  WhatsappMessage,
};
