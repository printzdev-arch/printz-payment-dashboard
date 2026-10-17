const { eventBus } = require("../job-order/jobEvents.emitter");

const emitProductOrderEvent = (eventName, payload) => {
  setImmediate(() => {
    try {
      eventBus.emit(`productOrder.${eventName}`, payload);
    } catch (err) {
      console.error(`[ProductOrderEvents] Error emitting 'productOrder.${eventName}':`, err.message);
    }
  });
};

module.exports = {
  emitProductOrderEvent,
};
