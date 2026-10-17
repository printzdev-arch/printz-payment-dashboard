const { eventBus } = require("../job-order/jobEvents.emitter");

const setupInventoryEventListeners = () => {
  eventBus.on("inventory.transaction.created", async (payload) => {
    try {
      // Listener hook for inventory alerts and replenishment triggers
      if (payload && payload.balance < payload.minLevel) {
        console.warn(`[InventoryEventsListener] Low stock alert for item ${payload.itemId}`);
      }
    } catch (err) {
      console.error("[InventoryEventsListener] Failed handling inventory event:", err.message);
    }
  });
};

module.exports = {
  setupInventoryEventListeners,
};
