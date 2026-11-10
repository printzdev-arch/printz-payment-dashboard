const { eventBus } = require("../../job-orders/services/jobEvents.emitter");

const setupCommonEventListeners = () => {
  // Global audit listener placeholder for system-wide domain events
  eventBus.on("audit.log", async (payload) => {
    try {
      const AuditLog = require("../../audit-logs/models/AuditLog");
      if (AuditLog && payload) {
        await AuditLog.create(payload);
      }
    } catch (err) {
      console.error("[CommonEventsListener] Failed to log audit event:", err.message);
    }
  });
};

module.exports = {
  setupCommonEventListeners,
};
