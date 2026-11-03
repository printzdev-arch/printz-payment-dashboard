const mongoose = require("mongoose");
const productionOrderRepository = require("../models/ProductionOrder");
const productionOperationRepository = require("../models/ProductionOperation");
const qualityCheckRepository = require("../models/QualityCheck");
const ProductionStateService = require("./productionState.service");
const ErrorHelper = require("../../../utils/ApiError");

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const isObjectId = (v) => OBJECT_ID_RE.test(String(v || ""));

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];
const ACTIVE_OP_STATUSES = ["IN_PROGRESS", "RUNNING"];

// Operation fields a planner may change while the operation is still PENDING
const EDITABLE_OPERATION_FIELDS = [
  "sequenceNo",
  "operationCode",
  "operationName",
  "machine",
  "operatorName",
  "plannedStart",
  "plannedEnd",
  "estimatedMinutes",
  "instructions",
  "remarks",
  "dependsOn",
];

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Non-admin users only see their own branch. Branch comes from the
 * logged-in user, never from the query string.
 */
const scopeQueryToUser = (query = {}, user = null) => {
  const scoped = { ...query };
  if (user && !ADMIN_ROLES.includes(String(user.role || "").toLowerCase()) && user.branchId) {
    scoped.branchId = String(user.branchId);
  }
  return scoped;
};

const resolveSampleImage = (order, jobOrder = {}) =>
  order.approvedSample?.fileUrl ||
  jobOrder.designProofUrl ||
  jobOrder.approvedSampleUrl ||
  jobOrder.sampleUrl ||
  jobOrder.proofUrl ||
  (Array.isArray(jobOrder.attachments)
    ? jobOrder.attachments.find(
        (a) => a.url && (/\.(png|jpe?g|webp|svg)($|\?)/i.test(a.url) || a.type === "Artwork File" || a.type === "Proof")
      )?.url || jobOrder.attachments[0]?.url
    : null) ||
  null;

const resolveApprovedSample = (order, jobOrder, sampleImageUrl) => {
  if (order.approvedSample?.fileUrl) return order.approvedSample;
  if (!sampleImageUrl) return null;
  return {
    fileUrl: sampleImageUrl,
    thumbnailUrl: sampleImageUrl,
    customerComments: jobOrder.customerRequirements || jobOrder.remarks || "",
    approvedAt: jobOrder.updatedAt || null,
  };
};

const resolveMachineName = (order) =>
  order.machine ||
  (order.machineId && typeof order.machineId === "object"
    ? `${order.machineId.printerName || order.machineId.model || ""}`.trim()
    : null);

const resolveEmployeeNames = (order) => {
  if (Array.isArray(order.assignedEmployees) && order.assignedEmployees.length > 0) {
    return order.assignedEmployees;
  }
  if (Array.isArray(order.assignedEmployeeIds) && order.assignedEmployeeIds.length > 0) {
    return order.assignedEmployeeIds
      .map((u) => (u && typeof u === "object" ? u.name || u.email : null))
      .filter(Boolean);
  }
  return [];
};

// What the Production Orders page should offer for each status
const nextActionFor = (status) => {
  if (status === "UNASSIGNED") return "PLAN";
  if (status === "PLANNED") return "VIEW";
  if (["IN_PROGRESS", "ON_HOLD", "QC", "QC_ISSUE", "REWORK_REQUIRED", "REPRINT_REQUIRED"].includes(status)) {
    return "TRACK";
  }
  return "VIEW";
};

/**
 * Flat, consistent shape for list pages (no field-name guessing in the UI).
 */
const buildOrderView = (order, operations = []) => {
  const job = order.jobOrderId && typeof order.jobOrderId === "object" ? order.jobOrderId : {};
  const branch = order.branchId && typeof order.branchId === "object" ? order.branchId : {};
  const snapshot = order.specificationsSnapshot || {};
  const sampleImageUrl = resolveSampleImage(order, job);

  return {
    ...order,
    id: String(order._id),
    jobOrderNo: job.jobNo || null,
    jobNo: job.jobNo || null,
    customerName: job.customerName || job.customerSnapshot?.name || null,
    customerMobile: job.customerPhone || job.customerSnapshot?.mobile || "",
    productName: snapshot.productName || job.title || null,
    productCategory: snapshot.productCategory || snapshot.productType || job.productCategory || "",
    quantity: order.plannedQty,
    branch: branch.name || null,
    branchName: branch.name || null,
    machine: resolveMachineName(order),
    assignedEmployees: resolveEmployeeNames(order),
    dueDate: job.dueDate || null,
    isPlanned: order.status !== "UNASSIGNED",
    nextAction: nextActionFor(order.status),
    operations,
    approvedSample: resolveApprovedSample(order, job, sampleImageUrl),
    sampleImageUrl,
    designProofUrl: sampleImageUrl,
  };
};

const groupByOrder = (operations) => {
  const map = {};
  operations.forEach((op) => {
    const key = op.productionOrderId ? op.productionOrderId.toString() : "";
    if (!map[key]) map[key] = [];
    map[key].push(op);
  });
  return map;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Service                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

class ProductionOrderService {
  /**
   * List production orders. Pure read: orders are created when a job becomes
   * eligible (see productionEvents / backfillMissingOrders), never from GET.
   */
  static async findAll(query = {}, user = null) {
    const { items, total, page, limit } = await productionOrderRepository.findAll(
      scopeQueryToUser(query, user)
    );

    // Filter out orders for Print Only or Design Only jobs (they do not undergo production),
    // and cleanup any standalone orders erroneously created for finishing services
    const filteredItems = [];
    const deleteIds = [];
    for (const item of items) {
      const job = item.jobOrderId && typeof item.jobOrderId === "object" ? item.jobOrderId : {};
      const jobTypeStr = String(job.jobType || "").toUpperCase();
      const isPrintOnly = jobTypeStr.includes("PRINT") && !jobTypeStr.includes("DESIGN");
      const isDesignOnly = jobTypeStr.includes("DESIGN") && !jobTypeStr.includes("PRINT");
      const pName = String(item.specificationsSnapshot?.productName || "").toUpperCase().trim();
      const isFinishingPO = pName.startsWith("FINISHING:") || pName.startsWith("FINISHING -") || pName.startsWith("FINISHING ");

      if (isPrintOnly || isDesignOnly || isFinishingPO) {
        deleteIds.push(item._id);
      } else {
        filteredItems.push(item);
      }
    }

    if (deleteIds.length > 0) {
      try {
        await productionOrderRepository.deleteMany({ _id: { $in: deleteIds } });
        await productionOperationRepository.deleteMany({ productionOrderId: { $in: deleteIds } });
      } catch (e) {
        // non-blocking
      }
    }

    const orderIds = filteredItems.map((i) => i._id);
    const operations = await productionOperationRepository.findByProductionOrders(orderIds);
    const opsByOrder = groupByOrder(operations);

    const enriched = filteredItems.map((item) => buildOrderView(item, opsByOrder[item._id.toString()] || []));
    return { items: enriched, total: Math.max(0, total - deleteIds.length), page, limit };
  }

  /**
   * Dashboard KPIs, counted in the database.
   */
  static async getStats(query = {}, user = null) {
    const scoped = scopeQueryToUser(query, user);
    return productionOrderRepository.getStats({
      branchId: scoped.branchId || null,
      from: scoped.from || null,
      to: scoped.to || null,
    });
  }

  /**
   * One-off / startup helper: create the missing UNASSIGNED order for jobs
   * already waiting in PRODUCTION_PLANNING (jobs approved before the
   * event listener existed). Safe to run repeatedly.
   */
  static async backfillMissingOrders() {
    const JobOrder = mongoose.model("JobOrder");
    const ProductionPlanningService = require("./productionPlanning.service");

    const planningJobs = await JobOrder.find({ currentStage: "PRODUCTION_PLANNING" })
      .select("_id")
      .lean();
    if (!planningJobs.length) return { checked: 0, created: 0 };

    const jobIds = planningJobs.map((j) => j._id);
    const existing = await productionOrderRepository
      .find({ jobOrderId: { $in: jobIds }, status: { $ne: "CANCELLED" } })
      .select("jobOrderId")
      .lean();
    const covered = new Set(existing.map((p) => String(p.jobOrderId)));

    let created = 0;
    for (const job of planningJobs) {
      if (!covered.has(String(job._id))) {
        await ProductionPlanningService.createUnassignedOrder(job._id);
        created += 1;
      }
    }
    return { checked: planningJobs.length, created };
  }

  /**
   * One production order with operations, QC history and status history.
   */
  static async findById(id, user = null) {
    if (!isObjectId(id)) {
      throw ErrorHelper.badRequest(`Invalid production order ID: ${id}`);
    }

    const order = await productionOrderRepository.findByIdWithDetails(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    // Branch users cannot open another branch's order
    const scoped = scopeQueryToUser({}, user);
    const orderBranch = String(order.branchId?._id || order.branchId || "");
    if (scoped.branchId && orderBranch && scoped.branchId !== orderBranch) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    const [operations, qualityChecks] = await Promise.all([
      productionOperationRepository.findByProductionOrder(order._id),
      qualityCheckRepository.findByProductionOrder(order._id),
    ]);

    const orderObj = order.toObject ? order.toObject() : { ...order };

    // Legacy orders without a snapshot: rebuild from the linked job item
    if (!orderObj.specificationsSnapshot || Object.keys(orderObj.specificationsSnapshot).length === 0) {
      try {
        const JobItemModel = require("../../job-orders/models/JobItem");
        const JobOrderModel = require("../../job-orders/models/JobOrder");
        const { buildSpecificationSnapshot } = require("./productionSpecificationHelper");

        const itemDoc = order.jobItemId ? await JobItemModel.findById(order.jobItemId).lean() : null;
        const jobDoc =
          order.jobOrderId && typeof order.jobOrderId === "object"
            ? order.jobOrderId
            : order.jobOrderId
            ? await JobOrderModel.findById(order.jobOrderId).lean()
            : {};

        orderObj.specificationsSnapshot = buildSpecificationSnapshot(itemDoc || {}, jobDoc || {});
      } catch (_) {
        // keep the order readable even if the snapshot cannot be rebuilt
      }
    }

    const sortedOperations = (operations || [])
      .map((o) => (o.toObject ? o.toObject() : o))
      .sort((a, b) => (a.sequenceNo || 0) - (b.sequenceNo || 0));

    return {
      ...buildOrderView(orderObj, sortedOperations),
      qualityChecks: qualityChecks || [],
    };
  }

  /**
   * Update non-status fields. Status changes go through hold/resume/cancel,
   * operation completion and QC, which validate every transition.
   */
  static async update(id, updateData = {}, user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    if (updateData.status !== undefined) {
      throw ErrorHelper.badRequest(
        "Status cannot be edited directly. Use hold, resume, cancel, operation completion or QC."
      );
    }
    if (ProductionOrderService.isClosed(order.status)) {
      throw ErrorHelper.badRequest(`Cannot edit a ${order.status} production order.`);
    }

    const changes = {};
    if (updateData.plannedStart !== undefined) changes.plannedStart = new Date(updateData.plannedStart);
    if (updateData.plannedEnd !== undefined) changes.plannedEnd = new Date(updateData.plannedEnd);
    if (updateData.machineId !== undefined) {
      if (updateData.machineId && !isObjectId(updateData.machineId)) {
        throw ErrorHelper.badRequest("Invalid machine ID.");
      }
      changes.machineId = updateData.machineId || null;
    }
    if (updateData.assignedEmployeeIds !== undefined) {
      const ids = Array.isArray(updateData.assignedEmployeeIds) ? updateData.assignedEmployeeIds : [];
      if (ids.some((v) => !isObjectId(v))) {
        throw ErrorHelper.badRequest("Invalid employee ID in assignedEmployeeIds.");
      }
      changes.assignedEmployeeIds = ids;
    }
    if (updateData.priority !== undefined) {
      const p = String(updateData.priority).toUpperCase().trim();
      changes.priority = p === "RUSH" ? "URGENT" : p;
    }
    if (updateData.notes !== undefined) changes.notes = String(updateData.notes).trim();

    if (changes.plannedStart && changes.plannedEnd && changes.plannedEnd < changes.plannedStart) {
      throw ErrorHelper.badRequest("Planned end cannot be before planned start.");
    }

    Object.assign(order, changes);
    await order.save();

    await ProductionStateService.logAudit({
      action: "JOB_UPDATE",
      resource: "ProductionOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { changes },
    });

    return order;
  }

  static isClosed(status) {
    return productionOrderRepository.CLOSED_STATUSES.includes(status);
  }

  /**
   * Hold. A reason is required.
   */
  static async hold(id, reason = "", user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      throw ErrorHelper.badRequest("A reason is required to hold a production order.");
    }
    if (!["PLANNED", "IN_PROGRESS"].includes(order.status)) {
      throw ErrorHelper.badRequest(
        `Only PLANNED or IN_PROGRESS orders can be put on hold (current: ${order.status}).`
      );
    }

    order.holdReason = cleanReason;
    await ProductionStateService.transitionOrder(order, "ON_HOLD", { reason: cleanReason, user });

    await ProductionStateService.createNotification({
      role: "production",
      branchId: order.branchId,
      title: "Production Order On Hold",
      message: `Production Order ${order.productionNo} has been placed ON HOLD. Reason: ${cleanReason}`,
      entityType: "PRODUCTION",
      entityId: order._id,
    });

    return order;
  }

  /**
   * Resume. Goes back to the status the order had before the hold.
   */
  static async resume(id, reason = "", user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }
    if (order.status !== "ON_HOLD") {
      throw ErrorHelper.badRequest("Only ON_HOLD production orders can be resumed.");
    }

    // Previous status from the history; fall back to inspecting the operations
    const lastHold = [...(order.statusHistory || [])].reverse().find((h) => h.to === "ON_HOLD");
    let target = lastHold && ["PLANNED", "IN_PROGRESS"].includes(lastHold.from) ? lastHold.from : null;

    if (!target) {
      const started = await productionOperationRepository.findOne({
        productionOrderId: order._id,
        status: { $in: ["IN_PROGRESS", "RUNNING", "PAUSED", "COMPLETED"] },
      });
      target = started ? "IN_PROGRESS" : "PLANNED";
    }

    order.holdReason = null;
    await ProductionStateService.transitionOrder(order, target, {
      reason: String(reason || "").trim() || "Resumed",
      user,
    });

    return order;
  }

  /**
   * Cancel. A reason is required. Open operations are closed as SKIPPED.
   */
  static async cancel(id, reason = "", user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      throw ErrorHelper.badRequest("A reason is required to cancel a production order.");
    }
    if (ProductionOrderService.isClosed(order.status) || order.status === "QC_PASSED") {
      throw ErrorHelper.badRequest(`Cannot cancel a ${order.status} production order.`);
    }

    order.cancelReason = cleanReason;
    await ProductionStateService.transitionOrder(order, "CANCELLED", { reason: cleanReason, user });

    await productionOperationRepository.updateMany(
      {
        productionOrderId: order._id,
        status: { $in: ["PENDING", "IN_PROGRESS", "RUNNING", "PAUSED", "ON_HOLD", "FAILED"] },
      },
      { $set: { status: "SKIPPED", remarks: `Cancelled: ${cleanReason}`, endAt: new Date() } }
    );

    return order;
  }

  /**
   * Edit PENDING operations (order, machine, schedule, instructions).
   * Started or finished operations are protected: if any requested operation
   * is not PENDING, nothing is changed and a 409 lists them.
   */
  static async updateOperations(id, operationsData = [], user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }
    if (ProductionOrderService.isClosed(order.status)) {
      throw ErrorHelper.badRequest(`Cannot edit operations of a ${order.status} production order.`);
    }
    if (!Array.isArray(operationsData) || operationsData.length === 0) {
      throw ErrorHelper.badRequest("A list of operations is required.");
    }

    const requested = operationsData.filter((o) => o && o._id);
    const ids = requested.map((o) => o._id);
    if (ids.some((v) => !isObjectId(v))) {
      throw ErrorHelper.badRequest("Invalid operation ID in the operations list.");
    }

    const existing = await productionOperationRepository.find({
      _id: { $in: ids },
      productionOrderId: order._id,
    });
    const existingById = new Map(existing.map((o) => [String(o._id), o]));

    const missing = ids.filter((v) => !existingById.has(String(v)));
    if (missing.length) {
      throw ErrorHelper.notFound(`Operations not found on this order: ${missing.join(", ")}`);
    }
    const locked = existing.filter((o) => o.status !== "PENDING");
    if (locked.length) {
      throw ErrorHelper.conflict(
        `Cannot edit operations that have started or finished: ${locked
          .map((o) => `${o.operationCode} (Seq #${o.sequenceNo}, ${o.status})`)
          .join(", ")}.`
      );
    }

    for (const update of requested) {
      const set = {};
      EDITABLE_OPERATION_FIELDS.forEach((field) => {
        if (update[field] !== undefined) set[field] = update[field];
      });
      if (update.machineId !== undefined) {
        if (update.machineId && !isObjectId(update.machineId)) {
          throw ErrorHelper.badRequest("Invalid machine ID.");
        }
        set.machineId = update.machineId || null;
      }
      if (update.assignedEmployeeId !== undefined) {
        if (update.assignedEmployeeId && !isObjectId(update.assignedEmployeeId)) {
          throw ErrorHelper.badRequest("Invalid employee ID.");
        }
        set.assignedEmployeeId = update.assignedEmployeeId || null;
      }
      if (set.operationCode) set.operationCode = String(set.operationCode).toUpperCase().trim();

      if (Object.keys(set).length) {
        await productionOperationRepository.findByIdAndUpdate(update._id, { $set: set });
      }
    }

    await ProductionStateService.logAudit({
      action: "OPERATIONS_UPDATED",
      resource: "ProductionOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { operationIds: ids },
    });

    return productionOperationRepository.findByProductionOrder(order._id);
  }
}

module.exports = ProductionOrderService;