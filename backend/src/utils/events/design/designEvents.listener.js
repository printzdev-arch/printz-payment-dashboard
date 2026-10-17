const { eventBus } = require("../job-order/jobEvents.emitter");

const setupDesignEventListeners = (designAllocationService) => {
  eventBus.on("job.stage.changed", async (payload) => {
    // Keep job in DESIGN_QUEUE for supervisor/manager manual assignment
    // Auto-allocation is triggered on-demand via the auto-assign API if desired
  });

  eventBus.on("job.cancelled", async (payload) => {
    if (payload && payload.jobId) {
      try {
        const JobAssignment = require("../../../models/design/JobAssignment");
        await JobAssignment.updateMany(
          { jobOrderId: payload.jobId, currentAssignment: true },
          { $set: { status: "CANCELLED", currentAssignment: false, releasedAt: new Date() } }
        );
      } catch (err) {
        console.error(`[DesignEventsListener] Failed to release assignment for cancelled Job ${payload.jobId}:`, err.message);
      }
    }
  });
};

module.exports = {
  setupDesignEventListeners,
};
