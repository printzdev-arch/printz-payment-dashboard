const { eventBus } = require("../job-order/jobEvents.emitter");
const SlaService = require("../../../application/services/sla/sla.service");

const setupSlaEventListeners = () => {
  const invalidate = (payload) => {
    const jobId = payload?.jobId || payload?.jobOrderId || payload?.id;
    SlaService.invalidateCache(jobId || null);
  };

  // Stage changes
  eventBus.on("job.stage.changed", invalidate);

  // Design events
  eventBus.on("design.assigned", invalidate);
  eventBus.on("design.accepted", invalidate);
  eventBus.on("design.rejected", invalidate);
  eventBus.on("design.started", invalidate);
  eventBus.on("design.reassigned", invalidate);

  // Sample events
  eventBus.on("sample.submitted", invalidate);
  eventBus.on("sample.revisionRequired", invalidate);
  eventBus.on("sample.approved", invalidate);

  // Workflow status events
  eventBus.on("job.onHold", invalidate);
  eventBus.on("job.resumed", invalidate);
  eventBus.on("job.cancelled", invalidate);
  eventBus.on("job.created", invalidate);
};

module.exports = {
  setupSlaEventListeners,
};
