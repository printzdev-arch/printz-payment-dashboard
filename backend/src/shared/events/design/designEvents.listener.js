const { eventBus } = require("../job-order/jobEvents.emitter");

const setupDesignEventListeners = (designAllocationService) => {
  eventBus.on("job.stage.changed", async (payload) => {
    if (payload && payload.toStage === "DESIGN_QUEUE" && !payload.resumed) {
      try {
        if (designAllocationService && typeof designAllocationService.autoAllocate === "function") {
          await designAllocationService.autoAllocate(payload.jobId);
        }
      } catch (err) {
        console.error(`[DesignEventsListener] Failed autoAllocate for Job ${payload.jobId}:`, err.message);
      }
    }
  });

  eventBus.on("job.cancelled", async (payload) => {
    if (payload && payload.jobId) {
      try {
        const JobAssignment = require("../../../infrastructure/database/mongoose/models/design/JobAssignment");
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
