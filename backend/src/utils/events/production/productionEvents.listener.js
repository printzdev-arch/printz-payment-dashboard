const { eventBus } = require("../job-order/jobEvents.emitter");

const setupProductionEventListeners = () => {
  eventBus.on("job.stage.changed", async (payload) => {
    if (payload && payload.toStage === "PRODUCTION_QUEUE") {
      try {
        console.log(`[ProductionEventsListener] Job ${payload.jobId} moved to PRODUCTION_QUEUE`);
      } catch (err) {
        console.error("[ProductionEventsListener] Error handling stage change:", err.message);
      }
    }
  });
};

module.exports = {
  setupProductionEventListeners,
};
