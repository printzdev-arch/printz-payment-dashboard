const productionOrderRepository = require("../models/ProductionOrder");
const productionOperationRepository = require("../models/ProductionOperation");
const ProductionStateService = require("./productionState.service");
const ErrorHelper = require("../../../utils/ApiError");

const ACTIVE_OP_STATUSES = ["PENDING", "IN_PROGRESS", "RUNNING", "PAUSED"];

class ReworkService {
  /**
   * Handle rework when QC finds an issue.
   *
   * Appends new PENDING rework operations to the SAME production order, from
   * the chosen operation onward (taken from the order's own operation list, so
   * the real finishing steps are used). The order goes
   * QC -> REWORK_REQUIRED -> IN_PROGRESS and the operations appear in the
   * tracking queue. When they finish the order returns to QC.
   *
   * `order` may be passed in (QC service does this so both work on the same
   * document); otherwise it is loaded by `productionOrderId`.
   */
  static async triggerRework({
    order: orderDoc = null,
    productionOrderId = null,
    reworkOperationCode = "PRINT",
    quantity = null,
    reason = "",
    qualityCheckId = null,
    user = null,
  }) {
    const order = orderDoc || (await productionOrderRepository.findById(productionOrderId));
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${productionOrderId}`);
    }
    if (!["QC", "QC_ISSUE", "REWORK_REQUIRED"].includes(order.status)) {
      throw ErrorHelper.conflict(
        `Rework can only be started from QC (current status of ${order.productionNo}: '${order.status}').`
      );
    }

    const allOps = await productionOperationRepository.findByProductionOrder(order._id);

    // Idempotent: do not queue a second rework while one is still open
    const activeRework = allOps.filter((op) => op.isRework && ACTIVE_OP_STATUSES.includes(op.status));

    const opCode = String(reworkOperationCode || "PRINT").toUpperCase().trim();
    const reworkQty = Number(quantity) > 0 ? Number(quantity) : order.actualQty || order.plannedQty;

    let created = [];
    if (activeRework.length === 0) {
      const base = allOps
        .filter((op) => !op.isRework)
        .sort((a, b) => a.sequenceNo - b.sequenceNo);

      const startIdx = base.findIndex((op) => op.operationCode === opCode);
      let chain;
      if (startIdx >= 0) {
        chain = base.slice(startIdx).map((op) => ({ code: op.operationCode, name: op.operationName || op.operationCode }));
      } else {
        chain = [{ code: opCode, name: opCode }];
        if (opCode !== "PACKING") chain.push({ code: "PACKING", name: "Packing" });
      }

      let nextSeq = allOps.reduce((max, op) => Math.max(max, op.sequenceNo || 0), 0) + 1;
      const remarks = `Rework from ${opCode}. Reason: ${reason || "QC issue"}`;

      created = await productionOperationRepository.insertMany(
        chain.map((step) => ({
          productionOrderId: order._id,
          jobOrderId: order.jobOrderId,
          branchId: order.branchId,
          operationCode: step.code,
          operationName: `Rework: ${step.name}`,
          sequenceNo: nextSeq++,
          dependsOn: [],
          assignedEmployeeId: null,
          plannedQty: reworkQty,
          inputQty: reworkQty,
          completedQty: 0,
          status: "PENDING",
          isRework: true,
          cycleNo: order.cycleNo || 0,
          cycleType: "REWORK",
          remarks,
        }))
      );

      order.reworkedQty = (order.reworkedQty || 0) + reworkQty;
    }

    // QC -> REWORK_REQUIRED -> IN_PROGRESS (each step audited)
    order.actualEnd = null;
    if (order.status === "QC" || order.status === "QC_ISSUE") {
      await ProductionStateService.transitionOrder(order, "REWORK_REQUIRED", {
        reason: `QC found issues: ${reason || "rework required"}`,
        user,
      });
    }
    if (order.status === "REWORK_REQUIRED") {
      await ProductionStateService.transitionOrder(order, "IN_PROGRESS", {
        reason: `Rework queued from ${opCode}`,
        user,
      });
    }

    await ProductionStateService.updateOrderProgress(order._id);
    await ProductionStateService.updateJobStage(order.jobOrderId, "REWORK");

    const firstNewOp = created[0] || activeRework[0] || null;

    await ProductionStateService.logAudit({
      action: "REWORK",
      resource: "ProductionOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: {
        reworkOperationCode: opCode,
        quantity: reworkQty,
        qualityCheckId,
        operationIds: created.map((o) => o._id),
        reason,
      },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: order.jobOrderId,
      productionOrderId: order._id,
      operationId: firstNewOp ? firstNewOp._id : null,
      eventType: "rework.started",
      stage: "REWORK",
      performedBy: user ? user._id : null,
      details: { opCode, reason, quantity: reworkQty },
    });

    await ProductionStateService.createNotification({
      role: "production",
      branchId: order.branchId,
      title: "Rework Operation Queued",
      message: `Rework from '${opCode}' (${reworkQty} units) has been queued for Production Order ${order.productionNo}.`,
      entityType: "PRODUCTION",
      entityId: order._id,
    });

    return {
      productionOrder: order,
      operations: created.length ? created : activeRework,
      firstNewOp,
      alreadyActive: created.length === 0,
    };
  }
}

module.exports = ReworkService;