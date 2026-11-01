const EventEmitter = require("events");

class AppEventEmitter extends EventEmitter {}

// Global shared event bus for workflow events
const eventBus = new AppEventEmitter();

const emitJobEvent = (eventName, payload) => {
  setImmediate(() => {
    try {
      eventBus.emit(eventName, payload);
    } catch (err) {
      console.error(`[EventBus] Error emitting '${eventName}':`, err);
    }
  });
};

module.exports = {
  eventBus,
  emitJobEvent,
};
