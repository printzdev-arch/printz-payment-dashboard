const { eventBus } = require("../../job-orders/events/jobEvents.emitter");

const emitCustomerEvent = (eventName, payload) => {
  setImmediate(() => {
    try {
      eventBus.emit(`customer.${eventName}`, payload);
    } catch (err) {
      console.error(`[CustomerEvents] Error emitting 'customer.${eventName}':`, err.message);
    }
  });
};

module.exports = {
  emitCustomerEvent,
};
