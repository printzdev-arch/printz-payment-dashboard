const mongoose = require("mongoose");
const { eventBus } = require("../../job-orders/events/jobEvents.emitter");

// Stages at which an approved job becomes available to production.
// createUnassignedOrder is idempotent, so a repeated or later event is harmless.
const TRIGGER_STAGES = ["PRODUCTION_PLANNING", "PRODUCTION_QUEUE"];

/**
 * Create any missing production orders for jobs that were approved before
 * this listener existed. Safe to run repeatedly.
 */
const runBackfill = async () => {
  try {
    const ProductionOrderService = require("../services/productionOrder.service");
    const result = await ProductionOrderService.backfillMissingOrders();
    if (result.created > 0) {
      console.log(
        `[ProductionEventsListener] Backfill created ${result.created} production order(s) for ${result.checked} planning job(s)`
      );
    }
  } catch (err) {
    console.error("[ProductionEventsListener] Backfill failed:", err.message);
  }
};

/** One-off startup cleanup of production orders wrongly created for finishing services. */
const runCleanup = async () => {
  try {
    const ProductionOrderService = require("../services/productionOrder.service");
    const result = await ProductionOrderService.cleanupFinishingOrders();
    if (result.removed > 0) {
      console.log(`[ProductionEventsListener] Removed ${result.removed} production order(s) wrongly created for finishing services`);
    }
  } catch (err) {
    console.error("[ProductionEventsListener] Cleanup failed:", err.message);
  }
};

const setupProductionEventListeners = () => {
  // When a job is approved and reaches production, create its production order
  // automatically (status UNASSIGNED, shown on the Planning page).
  eventBus.on("job.stage.changed", async (payload) => {
    if (!payload || !TRIGGER_STAGES.includes(payload.toStage)) return;

    try {
      const ProductionPlanningService = require("../services/productionPlanning.service");
      const orders = await ProductionPlanningService.createUnassignedOrder(payload.jobId);
      console.log(
        `[ProductionEventsListener] Job ${payload.jobId} moved to ${payload.toStage}: ` +
          `${orders ? orders.length : 0} production order(s) ready`
      );
    } catch (err) {
      console.error(
        `[ProductionEventsListener] Could not create production order for job ${payload.jobId}:`,
        err.message
      );
    }
  });

  // One-time backfill at startup (after the database is connected)
  const startupTasks = async () => {
    await runCleanup();
    await runBackfill();
  };
  if (mongoose.connection.readyState === 1) {
    startupTasks();
  } else {
    mongoose.connection.once("connected", startupTasks);
  }
};

module.exports = {
  setupProductionEventListeners,
  runBackfill,
};