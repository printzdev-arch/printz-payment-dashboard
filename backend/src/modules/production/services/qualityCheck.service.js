const mongoose = require("mongoose");
const DeliveryHelper = require("../../delivery/services/DeliveryHelper");
const qualityCheckRepository = require("../models/QualityCheck");
const productionOrderRepository = require("../models/ProductionOrder");
const reprintRequestRepository = require("../models/ReprintRequest");
const deliveryOrderRepository = require("../../delivery/models/DeliveryOrder");
const jobOrderRepository = require("../../job-orders/models/JobOrder");
const productionOperationRepository = require("../models/ProductionOperation");
const ReworkService = require("./rework.service");
const ReprintService = require("./reprint.service");
const ProductionStateService = require("./productionState.service");
const ErrorHelper = require("../../../utils/errors/ApiError");
const { getDatePrefix } = require("../../../utils/helpers/dateUtils");

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const isObjectId = (v) => OBJECT_ID_RE.test(String(v || ""));

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];
const PASS_RESULTS = ["PASS", "CONDITIONAL"];
const VALID_RESULTS = ["PASS", "CONDITIONAL", "ISSUE", "FAIL"];
const OPEN_REPRINT_STATUSES = ["REQUESTED", "APPROVED", "IN_PRODUCTION"];

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const scopeBranch = (branchId, user) => {
  if (user && !ADMIN_ROLES.includes(String(user.role || "").toLowerCase()) && user.branchId) {
    return String(user.branchId);
  }
  return branchId || null;
};

const toNumberOrNull = (value, label) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw ErrorHelper.badRequest(`${label} must be zero or a positive number.`);
  }
  return n;
};

const normalizeSeverity = (value) => {
  const s = String(value || "").toUpperCase().trim();
  return ["MINOR", "MAJOR", "CRITICAL"].includes(s) ? s : "MINOR";
};

// Accepts the old (defectCode / defectName) and new (code / description) shapes
const normalizeDefects = (defects) => {
  if (!Array.isArray(defects)) return [];
  return defects
    .filter(Boolean)
    .map((d) => ({
      code: String(d.code || d.defectCode || "").trim(),
      description: String(d.description || d.defectName || d.name || "").trim(),
      severity: normalizeSeverity(d.severity),
      affectedQuantity: Number(d.affectedQuantity ?? d.affectedQty ?? d.quantity ?? 0) || 0,
      notes: String(d.notes || d.remarks || "").trim(),
      attachments: Array.isArray(d.attachments) ? d.attachments : [],
    }));
};

const normalizeChecklist = (checklist) => {
  if (!Array.isArray(checklist)) return [];
  return checklist.map((item) => {
    const resVal = item.result || (item.passed === false ? "FAIL" : "PASS");
    return {
      item: item.item || "",
      result: ["PASS", "FAIL", "NA"].includes(resVal) ? resVal : "PASS",
      passed: resVal === "PASS" || resVal === "NA",
      notes: item.notes || "",
    };
  });
};

/**
 * Atomic delivery number (the old countDocuments + 1 produced duplicates).
 */
const nextDeliveryNo = async () => {
  const prefix = getDatePrefix();
  const Counter = mongoose.models.ProductionCounter;
  if (!Counter) {
    const count = await deliveryOrderRepository.countDocuments();
    return `DO-${prefix}-${String(count + 1).padStart(4, "0")}`;
  }
  const counter = await Counter.findOneAndUpdate(
    { _id: `DO_${prefix}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `DO-${prefix}-${String(counter.seq).padStart(4, "0")}`;
};

class QualityCheckService {
  /* ──────────────────────────────────────────────────────────────────────── */
  /* Pending list                                                             */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * Production orders waiting for inspection (status QC).
   */
  static async getPending(branchId = null, user = null) {
    const orders = await qualityCheckRepository.findPending(scopeBranch(branchId, user));
    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map((o) => o._id);
    const operations = await productionOperationRepository.findByProductionOrders(orderIds);
    const operationsByOrder = {};
    operations.forEach((op) => {
      const key = op.productionOrderId ? op.productionOrderId.toString() : "";
      if (!operationsByOrder[key]) operationsByOrder[key] = [];
      operationsByOrder[key].push(op);
    });

    return orders.map((o) => {
      const job = o.jobOrderId && typeof o.jobOrderId === "object" ? o.jobOrderId : {};
      const snapshot = o.specificationsSnapshot || {};
      return {
        ...o,
        id: String(o._id),
        jobNo: job.jobNo || "",
        customerName: job.customerName || job.customerSnapshot?.name || "",
        productName: snapshot.productName || job.title || "",
        dueDate: job.dueDate || null,
        quantity: o.actualQty || o.plannedQty || 0,
        operations: operationsByOrder[o._id.toString()] || [],
      };
    });
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Perform inspection                                                       */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * Record a QC inspection for a production order that is in status QC.
   *
   *   PASS / CONDITIONAL -> order QC_PASSED -> COMPLETED, job moves to delivery
   *                         once every order of the job is done
   *   ISSUE / FAIL       -> a corrective action is mandatory
   *       REWORK  -> rework operations are appended, order returns to IN_PROGRESS
   *       REPRINT -> a reprint request is raised, order waits in REPRINT_REQUIRED
   *
   * Partial quantities are supported: accepted units are counted as approved,
   * rejected units go to rework or reprint.
   */
  static async performCheck(productionOrderId, checkData = {}, user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to perform QC check.");
    }
    if (!isObjectId(productionOrderId)) {
      throw ErrorHelper.badRequest(`Invalid production order ID: ${productionOrderId}`);
    }

    const order = await productionOrderRepository.findById(productionOrderId);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${productionOrderId}`);
    }

    const scoped = scopeBranch(null, user);
    if (scoped && String(order.branchId) !== scoped) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${productionOrderId}`);
    }

    // Only an order that finished production can be inspected
    if (order.status !== "QC") {
      throw ErrorHelper.conflict(
        `Cannot perform QC on production order ${order.productionNo}: status is '${order.status}', expected 'QC'.`
      );
    }

    const {
      checkType = "FINAL",
      quantityChecked,
      acceptedQty,
      rejectedQty,
      issueDetails = "",
      correctiveAction = null,
      reprintQuantity = null,
      reworkOperationCode = "PRINT",
      restartFromOperationCode = "PRINT",
      comments = "",
      details = "",
      attachments = [],
    } = checkData;

    let result = String(checkData.result || "").toUpperCase().trim();
    if (!VALID_RESULTS.includes(result)) {
      throw ErrorHelper.badRequest("QC result is required: PASS, CONDITIONAL, ISSUE or FAIL.");
    }
    let isPass = PASS_RESULTS.includes(result);
    // The corrective action is decided from the quantities (see below), not chosen by the inspector
    let action = correctiveAction ? String(correctiveAction).toUpperCase().trim() : null;

    // ── Quantities (partial pass / partial fail supported) ──
    const checked =
      toNumberOrNull(quantityChecked, "quantityChecked") ?? Number(order.actualQty || order.plannedQty || 0);
    if (!(checked > 0)) {
      throw ErrorHelper.badRequest("Quantity checked must be greater than zero.");
    }

    let accepted = toNumberOrNull(acceptedQty, "acceptedQty");
    let rejected = toNumberOrNull(rejectedQty, "rejectedQty");
    if (accepted === null && rejected === null) {
      accepted = isPass ? checked : 0;
      rejected = isPass ? 0 : checked;
    } else if (accepted === null) {
      accepted = checked - rejected;
    } else if (rejected === null) {
      rejected = checked - accepted;
    }
    if (accepted < 0 || rejected < 0 || accepted + rejected !== checked) {
      throw ErrorHelper.badRequest(
        `Accepted (${accepted}) + rejected (${rejected}) must equal quantity checked (${checked}).`
      );
    }
    if (!isPass && rejected <= 0) {
      throw ErrorHelper.badRequest("A failed QC result must reject at least one unit.");
    }
    if (result === "PASS" && rejected > 0) {
      throw ErrorHelper.badRequest("A PASS result cannot have rejected units. Use ISSUE.");
    }
    // Rejected pieces are never dropped: a conditional pass that still rejects units is an issue,
    // so those units go to rework (or reprint) like any other failed inspection.
    if (isPass && rejected > 0) {
      result = "ISSUE";
      isPass = false;
    }

    // Rework only the rejected pieces (e.g. 25 of 100). When every piece checked is rejected,
    // nothing is worth reworking, so the whole quantity goes to a reprint instead.
    // "Everything" means the whole quantity under inspection, so a small sample check that is all bad stays a rework
    if (!isPass) {
      const underInspection = Math.max(checked, Number(order.actualQty) || 0);
      action = rejected >= underInspection ? "REPRINT" : "REWORK";
    }

    const defects = normalizeDefects(checkData.defects);
    const reprintQty = action === "REPRINT" ? rejected : null;
    if (action === "REPRINT" && (reprintQty <= 0 || reprintQty > checked)) {
      throw ErrorHelper.badRequest(`Reprint quantity must be between 1 and ${checked}.`);
    }

    // Build and validate the record first: nothing is saved if validation fails
    const qualityCheck = new qualityCheckRepository({
      productionOrderId: order._id,
      jobOrderId: order.jobOrderId,
      jobItemId: order.jobItemId,
      branchId: order.branchId,
      cycleNo: order.cycleNo || 0,
      checkType: String(checkType).toUpperCase() === "STAGE" ? "STAGE" : "FINAL",
      checkedBy: user._id,
      inspectorId: user._id,
      checkedAt: new Date(),
      result: isPass ? result : result === "FAIL" ? "FAIL" : "ISSUE",
      quantityChecked: checked,
      acceptedQty: accepted,
      rejectedQty: rejected,
      defects,
      issueDetails,
      correctiveAction: isPass ? action || "NONE" : action,
      reprintQuantity: reprintQty,
      reworkOperationCode: action === "REWORK" ? String(reworkOperationCode || "PRINT").toUpperCase().trim() : null,
      restartFromOperationCode:
        action === "REPRINT" ? String(restartFromOperationCode || "PRINT").toUpperCase().trim() : null,
      comments,
      attachments: Array.isArray(attachments) ? attachments : [],
      checklist: normalizeChecklist(checkData.checklist),
    });
    await qualityCheck.validate();

    // Quantities on the order accumulate across rework cycles
    order.approvedQty = (order.approvedQty || 0) + accepted;
    order.rejectedQty = (order.rejectedQty || 0) + rejected;

    const job = await jobOrderRepository.findById(order.jobOrderId);

    if (isPass) {
      return this.handlePass({ order, job, qualityCheck, user, result, accepted, rejected, comments });
    }
    return this.handleFailure({
      order,
      job,
      qualityCheck,
      user,
      result,
      action,
      accepted,
      rejected,
      reprintQty,
      issueDetails,
      comments,
      details,
      attachments,
      defects,
      reworkOperationCode: qualityCheck.reworkOperationCode,
      restartFromOperationCode: qualityCheck.restartFromOperationCode,
    });
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Pass                                                                     */
  /* ──────────────────────────────────────────────────────────────────────── */

  static async handlePass({ order, job, qualityCheck, user, result, accepted, rejected, comments }) {
    await qualityCheck.save();

    order.actualEnd = new Date();
    await ProductionStateService.transitionOrder(order, "QC_PASSED", {
      reason: `QC ${result}: ${accepted} accepted${rejected ? `, ${rejected} rejected` : ""}`,
      user,
    });
    await ProductionStateService.transitionOrder(order, "COMPLETED", {
      reason: "Quality check passed",
      user,
    });

    // A reprint cycle finished: close the request and the order that spawned it
    if (order.reprintRequestId) {
      await reprintRequestRepository.update(order.reprintRequestId, {
        status: "COMPLETED",
        completedAt: new Date(),
      });
    }
    if (order.parentProductionOrderId) {
      const parent = await productionOrderRepository.findById(order.parentProductionOrderId);
      if (parent && parent.status === "REPRINT_REQUIRED") {
        await ProductionStateService.transitionOrder(parent, "COMPLETED", {
          reason: `Reprint ${order.productionNo} passed QC`,
          user,
        });
      }
    }

    const handedOver = await this.completeJobIfReady(order, job, user, comments);

    await ProductionStateService.createJobApproval({
      jobOrderId: order.jobOrderId,
      productionOrderId: order._id,
      approvalType: "QC",
      status: "APPROVED",
      decidedBy: user._id,
      decidedAt: new Date(),
      remarks: comments || "QC Passed",
    }).catch((err) => console.error("[QC] Job approval record failed:", err.message));

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: order.jobOrderId,
      productionOrderId: order._id,
      eventType: "qc.passed",
      stage: "QC",
      performedBy: user._id,
      details: { acceptedQty: accepted, readyForDelivery: handedOver },
    });

    const ret = qualityCheck.toObject();
    ret.productionOrder = order.toObject();
    ret.readyForDelivery = handedOver;
    return ret;
  }

  /**
   * When every production order of the job is COMPLETED and no reprint is
   * open, the job moves to READY_FOR_DELIVERY and a delivery order is created.
   */
  static async completeJobIfReady(order, job, user, comments = "") {
    const [unfinished, openReprints] = await Promise.all([
      productionOrderRepository.countDocuments({
        jobOrderId: order.jobOrderId,
        status: { $nin: ["CANCELLED", "COMPLETED"] },
      }),
      reprintRequestRepository.countDocuments({
        jobOrderId: order.jobOrderId,
        status: { $in: OPEN_REPRINT_STATUSES },
      }),
    ]);
    if (unfinished > 0 || openReprints > 0) return false;

    await ProductionStateService.updateJobStage(order.jobOrderId, "READY_FOR_DELIVERY", "READY_FOR_DELIVERY");

    // Delivered quantity = everything QC approved for this job
    const completed = await productionOrderRepository
      .find({ jobOrderId: order.jobOrderId, status: "COMPLETED" })
      .select("approvedQty plannedQty")
      .lean();
    const approvedTotal = completed.reduce((sum, o) => sum + (o.approvedQty || 0), 0);
    const quantity = approvedTotal || order.actualQty || order.plannedQty;

    const existing = await deliveryOrderRepository.findOne({ jobOrderId: order.jobOrderId });
    if (!existing || existing.status === "READY") {
      await deliveryOrderRepository.upsert(
        { jobOrderId: order.jobOrderId },
        {
          deliveryNo: existing?.deliveryNo || (await nextDeliveryNo()),
          jobOrderId: order.jobOrderId,
          branchId: order.branchId,
          customerId: job?.customerId || null,
          customerName: job?.customerName || "Customer",
          customerPhone: job?.customerPhone || "",
          // Pickup or dispatch follows the delivery method the customer chose on the job order
          deliveryType: DeliveryHelper.typeForJob(job),
          deliveryMethod: job?.deliveryMethod || "",
          deliveryAddress: DeliveryHelper.isPickup(DeliveryHelper.typeForJob(job)) ? "" : job?.customerSnapshot?.address || "",
          quantity,
          status: "READY",
        }
      );
    }

    await ProductionStateService.createNotification({
      role: "manager",
      branchId: order.branchId,
      title: "Job Ready for Delivery",
      message: `Job ${job?.jobNo || order.jobOrderId} has passed QC and is ready for invoice and delivery.`,
      entityType: "JOB",
      entityId: order.jobOrderId,
    });

    return true;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Failure (rework / reprint)                                               */
  /* ──────────────────────────────────────────────────────────────────────── */

  static async handleFailure({
    order,
    job,
    qualityCheck,
    user,
    result,
    action,
    accepted,
    rejected,
    reprintQty,
    issueDetails,
    comments,
    details,
    attachments,
    defects,
    reworkOperationCode,
    restartFromOperationCode,
  }) {
    const reason = issueDetails || comments || "Defects detected during QC";
    let createdReprintReq = null;
    let reworkResult = null;

    // Corrective action runs BEFORE the QC record is saved, so a failure here
    // leaves no orphan inspection behind.
    if (action === "REWORK") {
      reworkResult = await ReworkService.triggerRework({
        order,
        reworkOperationCode,
        quantity: rejected,
        reason,
        qualityCheckId: qualityCheck._id,
        user,
      });
    } else {
      createdReprintReq = await ReprintService.createRequest(
        order.jobOrderId,
        {
          jobItemId: order.jobItemId,
          productionOrderId: order._id,
          qualityCheckId: qualityCheck._id,
          reason,
          defectType: defects[0]?.code || defects[0]?.description || "",
          quantity: reprintQty,
          sourceStage: "QC",
          restartFromOperationCode,
          details: details || issueDetails,
          attachments,
        },
        user
      );
      qualityCheck.reprintRequestId = createdReprintReq._id;

      await ProductionStateService.transitionOrder(order, "REPRINT_REQUIRED", {
        reason: `QC ${result}: reprint ${reprintQty} requested (${createdReprintReq.requestNo || createdReprintReq._id})`,
        user,
      });
    }

    await qualityCheck.save();

    await ProductionStateService.createJobApproval({
      jobOrderId: order.jobOrderId,
      productionOrderId: order._id,
      approvalType: "QC",
      status: "REJECTED",
      decidedBy: user._id,
      decidedAt: new Date(),
      remarks: reason,
    }).catch((err) => console.error("[QC] Job approval record failed:", err.message));

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: order.jobOrderId,
      productionOrderId: order._id,
      eventType: "qc.issue",
      stage: "QC",
      performedBy: user._id,
      details: { correctiveAction: action, issueDetails },
    });

    await ProductionStateService.createNotification({
      role: "manager",
      branchId: order.branchId,
      title: "QC Issue Reported",
      message: `QC issue logged for Production Order ${order.productionNo}. Corrective action: ${action}.`,
      entityType: "QC",
      entityId: qualityCheck._id,
    });

    const ret = qualityCheck.toObject();
    if (createdReprintReq) ret.reprintRequest = createdReprintReq;
    if (reworkResult) ret.reworkOperations = reworkResult.operations;
    ret.productionOrder = order.toObject();
    return ret;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Reads                                                                    */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * QC history for a production order (GET /production-orders/:id/qc-history).
   * Accepts an order id or a production number.
   */
  static async getHistoryForOrder(productionOrderId, user = null) {
    let order = null;
    if (isObjectId(productionOrderId)) {
      order = await productionOrderRepository.findById(productionOrderId);
    }
    if (!order) {
      order = await productionOrderRepository.findOne({ productionNo: String(productionOrderId) });
    }
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found: ${productionOrderId}`);
    }

    const scoped = scopeBranch(null, user);
    if (scoped && String(order.branchId) !== scoped) {
      throw ErrorHelper.notFound(`Production Order not found: ${productionOrderId}`);
    }

    const [qualityChecks, reprintRequests] = await Promise.all([
      qualityCheckRepository.find({ productionOrderId: order._id }).sort({ checkedAt: 1 }).lean(),
      reprintRequestRepository.find({ productionOrderId: order._id }).sort({ createdAt: 1 }).lean(),
    ]);

    return {
      productionNo: order.productionNo,
      productionOrder: order,
      qualityChecks,
      reprintRequests,
    };
  }

  static async findAll(query = {}, user = null) {
    const scoped = { ...query };
    const branch = scopeBranch(query.branchId, user);
    if (branch) scoped.branchId = branch;
    return qualityCheckRepository.findAll(scoped);
  }

  static async findById(id, user = null) {
    if (!isObjectId(id)) {
      throw ErrorHelper.badRequest(`Invalid quality check ID: ${id}`);
    }
    const qc = await qualityCheckRepository.findByIdWithDetails(id);
    if (!qc) {
      throw ErrorHelper.notFound(`Quality Check not found with ID: ${id}`);
    }

    const scoped = scopeBranch(null, user);
    if (scoped && qc.branchId && String(qc.branchId) !== scoped) {
      throw ErrorHelper.notFound(`Quality Check not found with ID: ${id}`);
    }
    return qc;
  }

  static async getReport(id, user = null) {
    const qc = await this.findById(id, user);
    return {
      reportId: `QC-REP-${qc._id.toString().slice(-6).toUpperCase()}`,
      generatedAt: new Date(),
      qualityCheck: qc,
      jobOrder: qc.jobOrderId,
      productionOrder: qc.productionOrderId,
      inspector: qc.checkedBy,
    };
  }
}

module.exports = QualityCheckService;