const productionOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOrderRepository");
const productionOperationRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOperationRepository");
const ProductionStateService = require("./productionState.service");
const RoundRobinService = require("./roundRobin.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class ReworkService {
  /**
   * Handle Rework when QC finds an issue.
   * Appends new PENDING rework operation(s) into the queue.
   */
  static async triggerRework({
    productionOrderId,
    reworkOperationCode = "PRINT",
    quantity = null,
    reason = "",
    user = null,
  }) {
    const order = await productionOrderRepository.findById(productionOrderId);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${productionOrderId}`);
    }

    // Find the highest sequence number
    const maxSeqOp = await productionOperationRepository.findOne({ productionOrderId: order._id });

    // Look for all operations to find max sequence number
    const allOps = await productionOperationRepository.findByProductionOrder(order._id);
    let maxSeq = 0;
    allOps.forEach((op) => {
      if (op.sequenceNo > maxSeq) maxSeq = op.sequenceNo;
    });

    let nextSequenceNo = maxSeq > 0 ? maxSeq + 1 : (maxSeqOp ? maxSeqOp.sequenceNo + 1 : 1);
    const opCode = reworkOperationCode.toUpperCase().trim();
    const plannedQty = quantity || order.plannedQty;

    // Fetch Job Order and configured operations to build correct downstream chain
    const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoJobOrderRepository");
    const job = await jobOrderRepository.findById(order.jobOrderId);
    const targetItemId = order.jobItemId;
    const jobItem = job?.items?.find((i) => String(i._id) === String(targetItemId));

    // Build list of operations to run starting from opCode
    const operationsToCreate = [];

    if (opCode === "PRINT") {
      operationsToCreate.push({ code: "PRINT", name: "Rework: Printing" });
      if (jobItem && jobItem.finishing && Array.isArray(jobItem.finishing)) {
        for (const f of jobItem.finishing) {
          const fCode = (f.code || "FINISHING").toUpperCase().trim();
          operationsToCreate.push({ code: fCode, name: `Rework: ${f.name || fCode}` });
        }
      }
      operationsToCreate.push({ code: "PACKING", name: "Repackaging & Packing" });
    } else if (opCode === "PACKING") {
      operationsToCreate.push({ code: "PACKING", name: "Repackaging & Packing" });
    } else {
      // It's a finishing step (e.g. LAMINATION, CUTTING, etc.)
      operationsToCreate.push({ code: opCode, name: `Rework: ${opCode}` });

      if (jobItem && jobItem.finishing && Array.isArray(jobItem.finishing)) {
        let foundTarget = false;
        for (const f of jobItem.finishing) {
          const fCode = (f.code || "FINISHING").toUpperCase().trim();
          if (foundTarget) {
            operationsToCreate.push({ code: fCode, name: `Rework: ${f.name || fCode}` });
          } else if (fCode === opCode) {
            foundTarget = true;
          }
        }
      }
      operationsToCreate.push({ code: "PACKING", name: "Repackaging & Packing" });
    }

    let firstNewOp = null;

    for (const opInfo of operationsToCreate) {
      const assignedUser = await RoundRobinService.getNextEmployee(order.branchId, opInfo.code);
      const createdOp = await productionOperationRepository.create({
        productionOrderId: order._id,
        jobOrderId: order.jobOrderId,
        branchId: order.branchId,
        operationCode: opInfo.code,
        operationName: opInfo.name,
        sequenceNo: nextSequenceNo++,
        assignedEmployeeId: assignedUser ? assignedUser._id : null,
        plannedQty,
        inputQty: plannedQty,
        status: "PENDING",
        isRework: true,
        cycleNo: order.cycleNo || 0,
        cycleType: "REWORK",
        remarks: `Rework requested from ${opCode}. Reason: ${reason}`,
      });

      if (!firstNewOp) firstNewOp = createdOp;
    }

    // Update order and job status
    order.status = "IN_PROGRESS";
    await productionOrderRepository.save(order);

    await ProductionStateService.updateJobStage(order.jobOrderId, "REWORK");

    await ProductionStateService.logAudit({
      action: "REWORK",
      resource: "ProductionOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: {
        reworkOperationCode: opCode,
        newOperationId: firstNewOp ? firstNewOp._id : null,
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
      details: { opCode, reason },
    });

    await ProductionStateService.createNotification({
      role: "production",
      branchId: order.branchId,
      title: "Rework Operation Queued",
      message: `Rework operation '${opCode}' has been appended to Production Order ${order.productionNo}.`,
      entityType: "PRODUCTION",
      entityId: order._id,
    });

    return firstNewOp;
  }
}

module.exports = ReworkService;
