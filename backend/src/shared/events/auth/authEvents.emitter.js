const { eventBus } = require("../job-order/jobEvents.emitter");

const emitAuthEvent = (eventName, payload) => {
  setImmediate(() => {
    try {
      eventBus.emit(`auth.${eventName}`, payload);
    } catch (err) {
      console.error(`[AuthEvents] Error emitting 'auth.${eventName}':`, err.message);
    }
  });
};

module.exports = {
  emitAuthEvent,
};
