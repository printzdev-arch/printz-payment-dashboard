const productionOperationRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOperationRepository");
const productionOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOrderRepository");
const stockRepository = require("../../../infrastructure/database/mongoose/repositories/MongoStockRepository");
const inventoryMovementRepository = require("../../../infrastructure/database/mongoose/repositories/MongoInventoryMovementRepository");
const ProductionStateService = require("./productionState.service");
const RoundRobinService = require("./roundRobin.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class ProductionOperationService {
  /**
   * Check if all prior sequence operations are completed or skipped
   */
  static async validatePriorOperations(operation) {
    const priorOps = await productionOperationRepository.findPriorOperations(
      operation.productionOrderId,
      operation.sequenceNo
    );

    for (const prior of priorOps) {
      if (prior.status !== "COMPLETED" && prior.status !== "SKIPPED") {
        throw ErrorHelper.conflict(
          `Cannot proceed: Prior operation '${prior.operationCode}' (Seq #${prior.sequenceNo}) is in status '${prior.status}'.`
        );
      }
    }
  }

  /**
   * Assign employee to operation (or auto-assign via strict Round Robin)
   */
  static async assign(operationId, assignedEmployeeId = null, user = null) {
    const op = await productionOperationRepository.findById(operationId);
    if (!op) {
      throw ErrorHelper.notFound(`Production Operation not found with ID: ${operationId}`);
    }

    let targetEmployeeId = assignedEmployeeId;

    if (!targetEmployeeId) {
      // Auto-assign via strict Round Robin
      const parentOrder = await productionOrderRepository.findById(op.productionOrderId);
      const branchId = parentOrder ? parentOrder.branchId : op.branchId;
      const nextUser = await RoundRobinService.getNextEmployee(branchId, op.operationCode);
      if (nextUser) {
        targetEmployeeId = nextUser._id;
      }
    }

    if (!targetEmployeeId) {
      throw ErrorHelper.badRequest("No eligible employee available for round robin assignment.");
    }

    op.assignedEmployeeId = targetEmployeeId;
    await op.save();

    await ProductionStateService.logAudit({
      action: "ASSIGN",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: {
        assignedEmployeeId: targetEmployeeId,
        operationCode: op.operationCode,
      },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.assigned",
      stage: op.operationCode,
      assignedTo: targetEmployeeId,
      performedBy: user ? user._id : null,
    });

    return op.populate("assignedEmployeeId", "name email role");
  }

  /**
   * Operator claims the operation (assigns self)
   */
  static async claim(operationId, user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to claim operation.");
    }

    const op = await productionOperationRepository.findById(operationId);
    if (!op) {
      throw ErrorHelper.notFound(`Production Operation not found with ID: ${operationId}`);
    }

    if (op.status === "COMPLETED" || op.status === "SKIPPED") {
      throw ErrorHelper.badRequest(`Cannot claim an already ${op.status} operation.`);
    }

    op.assignedEmployeeId = user._id;
    await op.save();

    await ProductionStateService.logAudit({
      action: "CLAIM",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { claimedBy: user._id },
    });

    return op.populate("assignedEmployeeId", "name email role");
  }

  /**
   * Start an operation: PENDING -> RUNNING
   */
  static async start(operationId, data = {}, user = null) {
    const op = await productionOperationRepository.findById(operationId);
    if (!op) {
      throw ErrorHelper.notFound(`Production Operation not found with ID: ${operationId}`);
    }

    if (op.status === "RUNNING") {
      return op;
    }

    if (op.status !== "PENDING") {
      throw ErrorHelper.badRequest(`Cannot start operation with status '${op.status}'. Expected PENDING.`);
    }

    // Enforce sequence check: all preceding operations must be COMPLETED or SKIPPED
    await this.validatePriorOperations(op);

    op.status = "RUNNING";
    op.startAt = new Date();
    if (data.machineId) op.machineId = data.machineId;
    if (data.inputQty) op.inputQty = Number(data.inputQty);
    if (user && !op.assignedEmployeeId) op.assignedEmployeeId = user._id;

    await op.save();

    // If first operation, update parent ProductionOrder
    const parentOrder = await productionOrderRepository.findById(op.productionOrderId);
    if (parentOrder) {
      if (!parentOrder.actualStart) {
        parentOrder.actualStart = new Date();
      }
      if (parentOrder.status === "PLANNED") {
        parentOrder.status = "IN_PROGRESS";
      }
      await productionOrderRepository.save(parentOrder);
    }

    // Map stage to JobOrder
    let jobStage = "PRINTING";
    if (op.operationCode === "PRINT") jobStage = "PRINTING";
    else if (op.operationCode === "PACKING") jobStage = "PACKING";
    else jobStage = "FINISHING";

    await ProductionStateService.updateJobStage(op.jobOrderId, jobStage);

    await ProductionStateService.logAudit({
      action: "START",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { operationCode: op.operationCode, machineId: op.machineId },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.started",
      stage: jobStage,
      assignedTo: op.assignedEmployeeId,
      performedBy: user ? user._id : null,
    });

    return op;
  }

  /**
   * Complete an operation: RUNNING -> COMPLETED
   * Consumes inventory if consumption array provided.
   */
  static async complete(operationId, completeData = {}, user = null) {
    const op = await productionOperationRepository.findById(operationId);
    if (!op) {
      throw ErrorHelper.notFound(`Production Operation not found with ID: ${operationId}`);
    }

    if (op.status !== "RUNNING") {
      throw ErrorHelper.badRequest(`Cannot complete operation in status '${op.status}'. Expected RUNNING.`);
    }

    const {
      outputQty,
      completedQty,
      remarks,
      consumption = [],
    } = completeData;

    if (outputQty !== undefined && op.inputQty > 0 && Number(outputQty) > Number(op.inputQty)) {
      throw ErrorHelper.badRequest(
        `Output quantity (${outputQty}) cannot exceed input quantity (${op.inputQty}).`
      );
    }

    // Handle Inventory Consumption
    if (consumption && Array.isArray(consumption) && consumption.length > 0) {
      // Check if already consumed for this operation
      const alreadyConsumedItemIds = (op.consumptionRecords || []).map((r) => String(r.itemId));

      for (const item of consumption) {
        if (!item.itemId) continue;

        // Skip if this stock item was already consumed on this operation (idempotency guard)
        if (alreadyConsumedItemIds.includes(String(item.itemId))) {
          continue;
        }

        const stockItem = await stockRepository.findById(item.itemId);
        if (!stockItem) {
          throw ErrorHelper.notFound(`Stock item not found with ID: ${item.itemId}`);
        }

        const requiredQty = Number(item.quantity);
        const availableStock = Number(stockItem.qty || stockItem.quantity || stockItem.currentStock || 0);

        if (availableStock < requiredQty) {
          const err = new Error(
            `Insufficient stock for '${stockItem.itemName}'. Available: ${availableStock}, Required: ${requiredQty}`
          );
          err.statusCode = 422;
          err.code = "INSUFFICIENT_STOCK";
          throw err;
        }

        // Deduct inventory
        stockItem.qty = availableStock - requiredQty;
        stockItem.quantity = stockItem.qty;
        stockItem.currentStock = stockItem.qty;
        await stockRepository.save(stockItem);

        // Create Inventory Movement record
        await inventoryMovementRepository.create({
          itemId: stockItem._id,
          itemName: stockItem.itemName,
          type: "JOB_CONSUMPTION",
          action: "OUT",
          quantity: requiredQty,
          previousStock: availableStock,
          newStock: stockItem.qty,
          referenceType: "JOB",
          referenceId: String(op.jobOrderId || op.productionOrderId),
          notes: `Production consumption for ${op.operationCode}`,
          userId: user ? user._id : null,
        });

        op.consumptionRecords.push({
          itemId: stockItem._id,
          itemName: stockItem.itemName,
          quantity: requiredQty,
          unit: item.unit || stockItem.unit || "UNIT",
          consumptionType: item.consumptionType || "MATERIAL",
          consumedAt: new Date(),
        });
      }
    }

    op.status = "COMPLETED";
    op.endAt = new Date();
    if (outputQty !== undefined) op.outputQty = Number(outputQty);
    if (completedQty !== undefined) op.completedQty = Number(completedQty);
    else if (outputQty !== undefined) op.completedQty = Number(outputQty);
    if (remarks !== undefined) op.remarks = remarks;

    await op.save();

    await ProductionStateService.logAudit({
      action: "COMPLETE",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: {
        operationCode: op.operationCode,
        completedQty: op.completedQty,
        remarks: op.remarks,
      },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.completed",
      stage: op.operationCode,
      performedBy: user ? user._id : null,
      details: { completedQty: op.completedQty },
    });

    // Check if ALL operations for the ProductionOrder are now COMPLETED or SKIPPED
    const allOps = await productionOperationRepository.find({
      productionOrderId: op.productionOrderId,
    });

    const allFinished = allOps.every(
      (o) => o.status === "COMPLETED" || o.status === "SKIPPED"
    );

    if (allFinished) {
      const parentOrder = await productionOrderRepository.findById(op.productionOrderId);
      if (parentOrder) {
        parentOrder.status = "QC";
        parentOrder.actualQty = op.completedQty || op.outputQty || parentOrder.plannedQty;
        await productionOrderRepository.save(parentOrder);

        await ProductionStateService.updateJobStage(parentOrder.jobOrderId, "QC");

        await ProductionStateService.dispatchWorkflowEvent({
          jobOrderId: parentOrder.jobOrderId,
          productionOrderId: parentOrder._id,
          eventType: "productionOrder.qcPending",
          stage: "QC",
        });

        await ProductionStateService.createNotification({
          role: "manager",
          branchId: parentOrder.branchId,
          title: "Quality Control Required",
          message: `Production Order ${parentOrder.productionNo} completed all operations and is waiting for QC inspection.`,
          entityType: "QC",
          entityId: parentOrder._id,
        });
      }
    }

    return op;
  }

  /**
   * Fail an operation: RUNNING -> FAILED
   */
  static async fail(operationId, remarks = "", user = null) {
    const op = await productionOperationRepository.findById(operationId);
    if (!op) {
      throw ErrorHelper.notFound(`Production Operation not found with ID: ${operationId}`);
    }

    const remarkText = typeof remarks === "object" && remarks !== null ? (remarks.remarks || "") : String(remarks || "");

    op.status = "FAILED";
    op.remarks = remarkText || "Machine/material failure";
    await op.save();

    await ProductionStateService.logAudit({
      action: "FAIL",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { remarks: op.remarks },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.failed",
      stage: op.operationCode,
      performedBy: user ? user._id : null,
      details: { remarks: op.remarks },
    });

    await ProductionStateService.createNotification({
      role: "manager",
      branchId: op.branchId,
      title: "Operation Failed",
      message: `Operation '${op.operationCode}' on Order has FAILED. Reason: ${op.remarks}`,
      entityType: "PRODUCTION",
      entityId: op.productionOrderId,
    });

    return op;
  }

  /**
   * Retry a failed operation: FAILED -> PENDING
   */
  static async retry(operationId, user = null) {
    const op = await productionOperationRepository.findById(operationId);
    if (!op) {
      throw ErrorHelper.notFound(`Production Operation not found with ID: ${operationId}`);
    }

    if (op.status !== "FAILED") {
      throw ErrorHelper.badRequest("Only FAILED operations can be retried.");
    }

    op.status = "PENDING";
    op.remarks = `Retry requested. Previous error: ${op.remarks}`;
    await op.save();

    await ProductionStateService.logAudit({
      action: "RETRY",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { operationCode: op.operationCode },
    });

    return op;
  }

  /**
   * Skip an operation (finishing only): PENDING -> SKIPPED
   */
  static async skip(operationId, remarks = "", user = null) {
    const op = await productionOperationRepository.findById(operationId);
    if (!op) {
      throw ErrorHelper.notFound(`Production Operation not found with ID: ${operationId}`);
    }

    if (op.operationCode === "PRINT" || op.operationCode === "PACKING") {
      throw ErrorHelper.badRequest(`Cannot skip essential operation '${op.operationCode}'. Only finishing operations can be skipped.`);
    }

    if (op.status === "COMPLETED") {
      throw ErrorHelper.badRequest("Cannot skip an already COMPLETED operation.");
    }

    const remarkText = typeof remarks === "object" && remarks !== null ? (remarks.remarks || "") : String(remarks || "");

    op.status = "SKIPPED";
    op.remarks = remarkText || "Skipped by manager";
    op.endAt = new Date();
    await op.save();

    await ProductionStateService.logAudit({
      action: "SKIP",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { operationCode: op.operationCode, remarks: op.remarks },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.skipped",
      stage: op.operationCode,
      performedBy: user ? user._id : null,
      details: { remarks },
    });

    return op;
  }
}

module.exports = ProductionOperationService;
