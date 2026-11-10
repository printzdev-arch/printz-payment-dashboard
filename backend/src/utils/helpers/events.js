const { eventBus, emitJobEvent } = require("../../modules/job-orders/services/jobEvents.emitter");
const { setupDesignEventListeners } = require("../../modules/design/services/designEvents.listener");
const { setupCommonEventListeners } = require("../../modules/general/services/commonEvents.listener");
const { setupInventoryEventListeners } = require("../../modules/inventory/services/inventoryEvents.listener");
const { setupProductionEventListeners } = require("../../modules/production/services/productionEvents.listener");
const { emitAuthEvent } = require("../../modules/auth/services/authEvents.emitter");
const { emitCustomerEvent } = require("../../modules/customers/services/customerEvents.emitter");
const { emitPosEvent } = require("../../modules/pos/services/posEvents.emitter");

const initializeDomainEventListeners = (services = {}) => {
  setupDesignEventListeners(services.designAllocationService);
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
