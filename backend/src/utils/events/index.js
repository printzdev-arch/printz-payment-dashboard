const { eventBus, emitJobEvent } = require("../../modules/job-orders/events/jobEvents.emitter");
const { setupDesignEventListeners } = require("../../modules/design/events/designEvents.listener");
const { setupSlaEventListeners } = require("../../modules/sla/events/slaEvents.listener");
const { setupCommonEventListeners } = require("../../modules/general/events/commonEvents.listener");
const { setupInventoryEventListeners } = require("../../modules/inventory/events/inventoryEvents.listener");
const { setupProductionEventListeners } = require("../../modules/production/events/productionEvents.listener");
const { emitAuthEvent } = require("../../modules/auth/events/authEvents.emitter");
const { emitCustomerEvent } = require("../../modules/customers/events/customerEvents.emitter");
const { emitPosEvent } = require("../../modules/pos/events/posEvents.emitter");

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
  initializeDomainEventListeners,
};
