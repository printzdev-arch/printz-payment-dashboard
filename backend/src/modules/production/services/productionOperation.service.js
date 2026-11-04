const productionOperationRepository = require("../models/ProductionOperation");
const productionOrderRepository = require("../models/ProductionOrder");
const stockRepository = require("../../stocks/models/StockItem");
const inventoryMovementRepository = require("../../inventory/models/InventoryMovement");
const ProductionStateService = require("./productionState.service");
const RoundRobinService = require("./roundRobin.service");
const ErrorHelper = require("../../../utils/ApiError");

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const isObjectId = (v) => OBJECT_ID_RE.test(String(v || ""));

const ACTIVE_STATUSES = ["IN_PROGRESS", "RUNNING"]; // RUNNING = legacy value
const isActive = (status) => ACTIVE_STATUSES.includes(status);
const isFinished = (status) => status === "COMPLETED" || status === "SKIPPED";

// Accepts a plain string (old API shape) or an object body
const textFrom = (value, ...keys) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    for (const k of keys) {
      if (value[k]) return String(value[k]).trim();
    }
    return "";
  }
  return String(value).trim();
};

const minutesBetween = (from, to = new Date()) => {
  if (!from) return 0;
  const diff = (new Date(to) - new Date(from)) / 60000;
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff * 100) / 100 : 0;
};

// Start of the current working segment: the later of the last resume and the
// start time. After a failed operation is retried and started again, startAt is
// newer than any earlier resume, so old pause history is not counted again.
const segmentStart = (op) => {
  const log = op.pauseLog || [];
  const last = log[log.length - 1];
  if (last && last.resumedAt && (!op.startAt || new Date(last.resumedAt) > new Date(op.startAt))) {
    return last.resumedAt;
  }
  return op.startAt;
};

class ProductionOperationService {
  /* ──────────────────────────────────────────────────────────────────────── */
  /* Guards                                                                   */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * Load the parent order and make sure work is allowed on it.
   */
  static async getActiveParentOrder(op) {
    const order = await productionOrderRepository.findById(op.productionOrderId);
    if (!order) {
      throw ErrorHelper.notFound("Parent production order not found for this operation.");
    }
    if (order.status === "ON_HOLD") {
      throw ErrorHelper.conflict(
        `Production order ${order.productionNo} is ON HOLD. Resume it before working on its operations.`
      );
    }
    if (order.status === "CANCELLED") {
      throw ErrorHelper.conflict(`Production order ${order.productionNo} is CANCELLED.`);
    }
    return order;
  }

  /**
   * All prerequisite operations must be COMPLETED or SKIPPED.
   * Uses operation.dependsOn when set (parallel operations), otherwise
   * every lower sequence number.
   */
  static async validatePriorOperations(operation) {
    const priorOps = await productionOperationRepository.findPriorOperations(
      operation.productionOrderId,
      operation.sequenceNo,
      operation.dependsOn
    );

    for (const prior of priorOps) {
      if (!isFinished(prior.status)) {
        throw ErrorHelper.conflict(
          `Cannot proceed: prior operation '${prior.operationCode}' (Seq #${prior.sequenceNo}) is in status '${prior.status}'.`
        );
      }
    }
  }

  /**
   * A machine can run only one operation at a time.
   */
  static async assertMachineFree(op, machineId) {
    if (!machineId) return;
    const busy = await productionOperationRepository.findOne({
      _id: { $ne: op._id },
      machineId,
      status: { $in: ACTIVE_STATUSES },
    });
    if (busy) {
      throw ErrorHelper.conflict(
        `Machine is already running operation '${busy.operationCode}' (Seq #${busy.sequenceNo}). Pause or complete it first.`
      );
    }
  }

  static async findOperationOrFail(operationId) {
    if (!isObjectId(operationId)) {
      throw ErrorHelper.badRequest(`Invalid operation ID: ${operationId}`);
    }
    const op = await productionOperationRepository.findById(operationId);
    if (!op) {
      throw ErrorHelper.notFound(`Production Operation not found with ID: ${operationId}`);
    }
    return op;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Assignment                                                               */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * Assign an employee. With no ID given, the next employee in strict
   * round robin is chosen; if none is eligible, the requesting user is used.
   */
  static async assign(operationId, assignedEmployeeId = null, user = null) {
    const op = await this.findOperationOrFail(operationId);

    if (isFinished(op.status)) {
      throw ErrorHelper.badRequest(`Cannot assign an already ${op.status} operation.`);
    }

    let targetEmployeeId = assignedEmployeeId;
    if (targetEmployeeId && !isObjectId(targetEmployeeId)) {
      throw ErrorHelper.badRequest(`Invalid employee ID: ${targetEmployeeId}`);
    }

    if (!targetEmployeeId) {
      const next = await RoundRobinService.getNextEmployee(op.branchId, op.operationCode);
      targetEmployeeId = next ? next._id : null;
    }
    if (!targetEmployeeId && user) {
      targetEmployeeId = user._id;
    }

    op.assignedEmployeeId = targetEmployeeId || null;
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

    const op = await this.findOperationOrFail(operationId);

    if (isFinished(op.status)) {
      throw ErrorHelper.badRequest(`Cannot claim an already ${op.status} operation.`);
    }

    const current = op.assignedEmployeeId ? String(op.assignedEmployeeId) : null;
    if (current && current !== String(user._id) && (isActive(op.status) || op.status === "PAUSED")) {
      throw ErrorHelper.conflict("This operation is in progress under another operator.");
    }

    op.assignedEmployeeId = user._id;
    if (!op.operatorName) op.operatorName = user.name || "";
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

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Start / pause / resume                                                   */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * PENDING -> IN_PROGRESS
   * Accepts machineId (preferred) or machine name, operator name, input quantity.
   */
  static async start(operationId, data = {}, user = null) {
    const op = await this.findOperationOrFail(operationId);

    if (isActive(op.status)) {
      return op;
    }
    if (op.status === "PAUSED") {
      throw ErrorHelper.badRequest("This operation is paused. Use resume instead of start.");
    }
    if (op.status !== "PENDING") {
      throw ErrorHelper.badRequest(`Cannot start operation with status '${op.status}'. Expected PENDING.`);
    }

    const parentOrder = await this.getActiveParentOrder(op);
    if (parentOrder.status === "UNASSIGNED") {
      throw ErrorHelper.conflict(
        `Production order ${parentOrder.productionNo} has not been planned yet. Confirm the plan first.`
      );
    }

    await this.validatePriorOperations(op);

    const machineId = isObjectId(data.machineId) ? data.machineId : null;
    await this.assertMachineFree(op, machineId || op.machineId);

    const inputQty = data.inputQty !== undefined && data.inputQty !== null ? Number(data.inputQty) : null;
    if (inputQty !== null && (!Number.isFinite(inputQty) || inputQty <= 0)) {
      throw ErrorHelper.badRequest("Input quantity must be greater than zero.");
    }

    op.status = "IN_PROGRESS";
    op.startAt = new Date();
    if (machineId) op.machineId = machineId;
    if (data.machine) op.machine = String(data.machine).trim();
    if (data.assignedEmployee) op.operatorName = String(data.assignedEmployee).trim();
    if (inputQty !== null) op.inputQty = inputQty;
    if (data.remarks) op.remarks = String(data.remarks).trim();
    // The user who presses Start (usually the manager) is not recorded as the
    // operator; they are captured in the audit log. Operator = who does the work.

    await op.save();

    // First operation started -> order moves to IN_PROGRESS
    if (!parentOrder.actualStart) {
      parentOrder.actualStart = new Date();
    }
    if (parentOrder.status === "PLANNED") {
      await ProductionStateService.transitionOrder(parentOrder, "IN_PROGRESS", {
        reason: `Operation '${op.operationCode}' started`,
        user,
      });
    } else {
      await parentOrder.save();
    }

    // Map operation to job stage
    let jobStage = "FINISHING";
    if (op.operationCode === "PRINT") jobStage = "PRINTING";
    else if (op.operationCode === "PACKING") jobStage = "PACKING";
    await ProductionStateService.updateJobStage(op.jobOrderId, jobStage);

    await ProductionStateService.logAudit({
      action: "START",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { operationCode: op.operationCode, machineId: op.machineId, machine: op.machine },
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
   * IN_PROGRESS -> PAUSED, with a required reason.
   */
  static async pause(operationId, data = {}, user = null) {
    const op = await this.findOperationOrFail(operationId);

    if (!isActive(op.status)) {
      throw ErrorHelper.badRequest(`Only an in-progress operation can be paused (current: '${op.status}').`);
    }

    const reason = textFrom(data, "reason", "remarks");
    if (!reason) {
      throw ErrorHelper.badRequest("A reason is required to pause an operation.");
    }

    op.workedMinutes = (op.workedMinutes || 0) + minutesBetween(segmentStart(op));
    op.status = "PAUSED";
    op.pausedReason = reason;
    op.pauseLog.push({
      pausedAt: new Date(),
      reason,
      pausedBy: user ? user._id : null,
    });
    await op.save();

    await ProductionStateService.logAudit({
      action: "PAUSE",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { operationCode: op.operationCode, reason },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.paused",
      stage: op.operationCode,
      performedBy: user ? user._id : null,
      details: { reason },
    });

    return op;
  }

  /**
   * PAUSED -> IN_PROGRESS
   */
  static async resume(operationId, user = null) {
    const op = await this.findOperationOrFail(operationId);

    if (op.status !== "PAUSED") {
      throw ErrorHelper.badRequest(`Only a paused operation can be resumed (current: '${op.status}').`);
    }

    await this.getActiveParentOrder(op);
    await this.assertMachineFree(op, op.machineId);

    const last = op.pauseLog[op.pauseLog.length - 1];
    if (last && !last.resumedAt) {
      last.resumedAt = new Date();
    }
    op.status = "IN_PROGRESS";
    op.pausedReason = "";
    await op.save();

    await ProductionStateService.logAudit({
      action: "RESUME",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { operationCode: op.operationCode },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.resumed",
      stage: op.operationCode,
      performedBy: user ? user._id : null,
    });

    return op;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Complete                                                                 */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * IN_PROGRESS -> COMPLETED
   *
   * Body: inputQty?, outputQty, completedQty?, wastageQty?, remarks?
   *   consumption[]          items with itemId: stock is deducted
   *   materialConsumption[]  legacy shape (materialName, no itemId): recorded
   *                          on the operation only, NO stock is deducted
   */
  static async complete(operationId, completeData = {}, user = null) {
    const op = await this.findOperationOrFail(operationId);

    if (!isActive(op.status)) {
      throw ErrorHelper.badRequest(`Cannot complete operation in status '${op.status}'. Expected IN_PROGRESS.`);
    }

    await this.getActiveParentOrder(op);

    const { outputQty, completedQty, inputQty, wastageQty, remarks, consumption = [], materialConsumption = [] } =
      completeData;

    // Quantities
    const numbers = { inputQty, outputQty, completedQty, wastageQty };
    for (const [key, val] of Object.entries(numbers)) {
      if (val !== undefined && val !== null && (!Number.isFinite(Number(val)) || Number(val) < 0)) {
        throw ErrorHelper.badRequest(`${key} must be zero or a positive number.`);
      }
    }

    if (inputQty !== undefined && inputQty !== null) op.inputQty = Number(inputQty);

    if (outputQty !== undefined && op.inputQty > 0 && Number(outputQty) > Number(op.inputQty)) {
      throw ErrorHelper.badRequest(
        `Output quantity (${outputQty}) cannot exceed input quantity (${op.inputQty}).`
      );
    }

    // Stock-tracked consumption (idempotent per stock item)
    if (Array.isArray(consumption) && consumption.length > 0) {
      const alreadyConsumed = (op.consumptionRecords || [])
        .filter((r) => r.itemId)
        .map((r) => String(r.itemId));

      // Phase 1: validate every item BEFORE touching stock, so a failure on a
      // later item can never leave earlier items already deducted (a retry
      // would then deduct them a second time).
      const planned = [];
      const requiredByItem = new Map();
      const stockDocs = new Map();
      for (const item of consumption) {
        if (!item.itemId) continue;
        if (alreadyConsumed.includes(String(item.itemId))) continue;

        const requiredQty = Number(item.quantity);
        if (!Number.isFinite(requiredQty) || requiredQty <= 0) {
          throw ErrorHelper.badRequest(`Invalid consumption quantity for stock item ${item.itemId}.`);
        }

        // One document per stock item, so repeated lines deduct from the same copy
        let stockItem = stockDocs.get(String(item.itemId));
        if (!stockItem) {
          stockItem = await stockRepository.findById(item.itemId);
          if (!stockItem) {
            throw ErrorHelper.notFound(`Stock item not found with ID: ${item.itemId}`);
          }
          stockDocs.set(String(item.itemId), stockItem);
        }

        // The same stock item listed twice must be checked against the combined quantity
        const key = String(stockItem._id);
        const totalRequired = (requiredByItem.get(key) || 0) + requiredQty;
        requiredByItem.set(key, totalRequired);

        const availableStock = Number(stockItem.qty || stockItem.quantity || stockItem.currentStock || 0);
        if (availableStock < totalRequired) {
          const err = new Error(
            `Insufficient stock for '${stockItem.itemName}'. Available: ${availableStock}, Required: ${totalRequired}`
          );
          err.statusCode = 422;
          err.code = "INSUFFICIENT_STOCK";
          throw err;
        }

        planned.push({ item, stockItem, requiredQty });
      }

      // Phase 2: deduct
      for (const { item, stockItem, requiredQty } of planned) {
        const availableStock = Number(stockItem.qty || stockItem.quantity || stockItem.currentStock || 0);
        stockItem.qty = availableStock - requiredQty;
        stockItem.quantity = stockItem.qty;
        stockItem.currentStock = stockItem.qty;
        await stockRepository.save(stockItem);

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

    // Legacy / free-text materials: recorded for history, no inventory change
    if (Array.isArray(materialConsumption)) {
      for (const m of materialConsumption) {
        if (m.itemId || !m.materialName) continue;
        op.consumptionRecords.push({
          itemName: String(m.materialName).trim(),
          quantity: Number(m.quantity) || 0,
          unit: m.unit || "UNIT",
          consumptionType: `UNTRACKED_${String(m.consumptionType || "MATERIAL").toUpperCase().replace(/\s+/g, "_")}`,
          consumedAt: new Date(),
        });
      }
    }

    // Final numbers
    const out = outputQty !== undefined && outputQty !== null ? Number(outputQty) : op.outputQty;
    op.outputQty = out;
    op.completedQty =
      completedQty !== undefined && completedQty !== null ? Number(completedQty) : out;
    op.wastageQty =
      wastageQty !== undefined && wastageQty !== null
        ? Number(wastageQty)
        : Math.max(0, (op.inputQty || 0) - out);

    if (remarks !== undefined) op.remarks = String(remarks);

    op.workedMinutes = (op.workedMinutes || 0) + minutesBetween(segmentStart(op));
    op.status = "COMPLETED";
    op.endAt = new Date();
    await op.save();

    await ProductionStateService.logAudit({
      action: "COMPLETE",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: {
        operationCode: op.operationCode,
        inputQty: op.inputQty,
        outputQty: op.outputQty,
        completedQty: op.completedQty,
        wastageQty: op.wastageQty,
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

    await this.checkOrderCompletion(op, user);

    return op;
  }

  /**
   * After an operation is completed or skipped: refresh progress and, when
   * every operation is finished, send the order to QC.
   */
  static async checkOrderCompletion(op, user = null) {
    await ProductionStateService.updateOrderProgress(op.productionOrderId);

    const allOps = await productionOperationRepository.find({
      productionOrderId: op.productionOrderId,
    });
    if (!allOps.every((o) => isFinished(o.status))) return false;

    const parentOrder = await productionOrderRepository.findById(op.productionOrderId);
    if (!parentOrder || parentOrder.status !== "IN_PROGRESS") return false;

    // Quantity coming out of the production line = last operation in sequence
    const lastOp = [...allOps]
      .filter((o) => o.status === "COMPLETED")
      .sort((a, b) => b.sequenceNo - a.sequenceNo)[0];
    const producedQty = lastOp
      ? lastOp.completedQty || lastOp.outputQty
      : parentOrder.plannedQty;

    parentOrder.actualQty = producedQty || parentOrder.plannedQty;
    parentOrder.actualEnd = new Date();
    await ProductionStateService.transitionOrder(parentOrder, "QC", {
      reason: "All production operations finished",
      user,
    });

    // A Print Only job can be set up without quality control: there is no inspection to wait for
    const JobOrder = require("../../job-orders/models/JobOrder");
    const parentJob = await JobOrder.findById(parentOrder.jobOrderId).lean();
    if (parentJob && parentJob.qcRequired === false) {
      parentOrder.approvedQty = (parentOrder.approvedQty || 0) + (parentOrder.actualQty || 0);
      await ProductionStateService.transitionOrder(parentOrder, "QC_PASSED", {
        reason: "QC not required for this job order",
        user,
      });
      await ProductionStateService.transitionOrder(parentOrder, "COMPLETED", {
        reason: "QC not required for this job order",
        user,
      });
      const QualityCheckService = require("./qualityCheck.service");
      await QualityCheckService.completeJobIfReady(parentOrder, parentJob, user, "QC not required");

      await ProductionStateService.dispatchWorkflowEvent({
        jobOrderId: parentOrder.jobOrderId,
        productionOrderId: parentOrder._id,
        eventType: "productionOrder.qcSkipped",
        stage: "QC",
      });
      return true;
    }

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

    return true;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Fail / retry / skip                                                      */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * IN_PROGRESS or PAUSED -> FAILED
   * data: { failureReason, remarks, affectedQty } (a plain string is treated as remarks)
   */
  static async fail(operationId, data = {}, user = null) {
    const op = await this.findOperationOrFail(operationId);

    if (!isActive(op.status) && op.status !== "PAUSED") {
      throw ErrorHelper.badRequest(`Only a running or paused operation can fail (current: '${op.status}').`);
    }

    const failureReason = textFrom(data, "failureReason");
    const remarkText = textFrom(data, "remarks");
    const combined = [failureReason, remarkText].filter(Boolean).join(": ");

    if (isActive(op.status)) {
      op.workedMinutes = (op.workedMinutes || 0) + minutesBetween(segmentStart(op));
    }

    op.status = "FAILED";
    op.failureReason = failureReason;
    op.affectedQty = Number(data && data.affectedQty) || 0;
    op.remarks = combined || "Machine/material failure";
    await op.save();

    await ProductionStateService.logAudit({
      action: "FAIL",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { failureReason, remarks: remarkText, affectedQty: op.affectedQty },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.failed",
      stage: op.operationCode,
      performedBy: user ? user._id : null,
      details: { failureReason, remarks: op.remarks },
    });

    await ProductionStateService.createNotification({
      role: "manager",
      branchId: op.branchId,
      title: "Operation Failed",
      message: `Operation '${op.operationCode}' has FAILED. Reason: ${op.remarks}`,
      entityType: "PRODUCTION",
      entityId: op.productionOrderId,
    });

    return op;
  }

  /**
   * FAILED -> PENDING
   */
  static async retry(operationId, user = null) {
    const op = await this.findOperationOrFail(operationId);

    if (op.status !== "FAILED") {
      throw ErrorHelper.badRequest("Only FAILED operations can be retried.");
    }

    await this.getActiveParentOrder(op);

    op.status = "PENDING";
    op.startAt = null;
    op.remarks = `Retry requested. Previous error: ${op.remarks}`;
    op.failureReason = "";
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
   * Skip an operation (finishing steps only). A reason is required.
   * data: { reason | remarks } (a plain string is treated as the reason)
   */
  static async skip(operationId, data = "", user = null) {
    const op = await this.findOperationOrFail(operationId);

    if (op.operationCode === "PRINT" || op.operationCode === "PACKING") {
      throw ErrorHelper.badRequest(
        `Cannot skip essential operation '${op.operationCode}'. Only finishing operations can be skipped.`
      );
    }
    if (isFinished(op.status)) {
      throw ErrorHelper.badRequest(`Cannot skip an operation that is already ${op.status}.`);
    }
    if (isActive(op.status)) {
      throw ErrorHelper.badRequest("Cannot skip an operation that is running. Pause or fail it first.");
    }

    const reason = textFrom(data, "reason", "remarks");
    if (!reason) {
      throw ErrorHelper.badRequest("A reason is required to skip an operation.");
    }

    await this.getActiveParentOrder(op);

    op.status = "SKIPPED";
    op.remarks = reason;
    op.endAt = new Date();
    await op.save();

    await ProductionStateService.logAudit({
      action: "SKIP",
      resource: "ProductionOperation",
      resourceId: op._id,
      user,
      branchId: op.branchId,
      details: { operationCode: op.operationCode, reason },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: op.jobOrderId,
      productionOrderId: op.productionOrderId,
      operationId: op._id,
      eventType: "operation.skipped",
      stage: op.operationCode,
      performedBy: user ? user._id : null,
      details: { reason },
    });

    // Skipping the last open step must also send the order to QC
    await this.checkOrderCompletion(op, user);

    return op;
  }
}

module.exports = ProductionOperationService;