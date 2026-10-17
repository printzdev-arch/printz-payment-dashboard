const { eventBus, emitJobEvent } = require("./job-order/jobEvents.emitter");
const { setupDesignEventListeners } = require("./design/designEvents.listener");
const { setupSlaEventListeners } = require("./sla/slaEvents.listener");
const { setupCommonEventListeners } = require("./common/commonEvents.listener");
const { setupInventoryEventListeners } = require("./inventory/inventoryEvents.listener");
const { setupProductionEventListeners } = require("./production/productionEvents.listener");
const { emitAuthEvent } = require("./auth/authEvents.emitter");
const { emitCustomerEvent } = require("./customer/customerEvents.emitter");
const { emitPosEvent } = require("./pos/posEvents.emitter");
const { emitProductOrderEvent } = require("./product-order/productOrderEvents.emitter");

const initializeDomainEventListeners = (services = {}) => {
  setupDesignEventListeners(services.designAllocationService);
  setupSlaEventListeners();
  setupCommonEventListeners();
  setupInventoryEventListeners();
  setupProductionEventListeners();
};

module.exports = {
  eventBus,
  emitJobEvent,
  emitAuthEvent,
  emitCustomerEvent,
  emitPosEvent,
  emitProductOrderEvent,
  initializeDomainEventListeners,
};
