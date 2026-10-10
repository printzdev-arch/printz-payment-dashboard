const { eventBus } = require("../job-order/jobEvents.emitter");

const emitPosEvent = (eventName, payload) => {
  setImmediate(() => {
    try {
      eventBus.emit(`pos.${eventName}`, payload);
    } catch (err) {
      console.error(`[PosEvents] Error emitting 'pos.${eventName}':`, err.message);
    }
  });
};

module.exports = {
  emitPosEvent,
};
