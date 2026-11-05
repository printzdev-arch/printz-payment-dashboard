const reprintRequestRepository = require("../models/ReprintRequest");
const productionOrderRepository = require("../models/ProductionOrder");
const productionOperationRepository = require("../models/ProductionOperation");
const jobOrderRepository = require("../../job-orders/models/JobOrder");
const ProductionStateService = require("./productionState.service");
const ErrorHelper = require("../../../utils/ApiError");
const ProductionHelper = require("../helpers/ProductionHelper");

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const isObjectId = (v) => OBJECT_ID_RE.test(String(v || ""));

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];
const OPEN_STATUSES = ["REQUESTED", "APPROVED", "IN_PRODUCTION"];
const WAITING_STATUSES = ["REQUESTED", "PENDING_APPROVAL"];

const scopeBranch = (branchId, user) => {
  if (user && !ADMIN_ROLES.includes(String(user.role || "").toLowerCase()) && user.branchId) {
    return String(user.branchId);
  }
  return branchId || null;
};

/**
 * Operations a reprint cycle must run: from the restart operation to the end,
 * copied from the order that is being reprinted (so real finishing steps are
 * used, not a hardcoded list).
 */
const buildChain = (baseOps = [], restartCode = "PRINT") => {
  const base = baseOps.filter((o) => !o.isRework).sort((a, b) => a.sequenceNo - b.sequenceNo);
  const idx = base.findIndex((o) => o.operationCode === restartCode);
  if (idx >= 0) {
    return base.slice(idx).map((o) => ({ code: o.operationCode, name: o.operationName || o.operationCode }));
  }
  const chain = [{ code: restartCode, name: restartCode }];
  if (restartCode !== "PACKING") chain.push({ code: "PACKING", name: "Packing" });
  return chain;
};

class ReprintService {
  /**
   * Request a reprint (from QC, or manually from the Rework & Reprint page).
   * Starts as REQUESTED, which means "waiting for manager approval".
   */
  static async createRequest(jobOrderId, requestData = {}, user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to request reprint.");
    }

    const job = await jobOrderRepository.findById(jobOrderId);
    if (!job) {
      throw ErrorHelper.notFound(`Job Order not found with ID: ${jobOrderId}`);
    }
    ProductionHelper.assertBranchAccess(job.branchId, user, `Job Order ${jobOrderId}`);

    const {
      jobItemId,
      productionOrderId,
      qualityCheckId = null,
      defectType = "",
      sourceStage = "QC",
      restartFromOperationCode = "PRINT",
      details = "",
      attachments = [],
    } = requestData;

    const reason = String(requestData.reason || "").trim();
    if (!reason) {
      throw ErrorHelper.badRequest("Reason is required for reprint request.");
    }
    const quantity = Number(requestData.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw ErrorHelper.badRequest("Valid positive reprint quantity is required.");
    }

    // The order the defect was found on
    let sourceOrder = null;
    if (productionOrderId) {
      if (!isObjectId(productionOrderId)) {
        throw ErrorHelper.badRequest(`Invalid production order ID: ${productionOrderId}`);
      }
      sourceOrder = await productionOrderRepository.findById(productionOrderId);
      if (!sourceOrder || String(sourceOrder.jobOrderId) !== String(job._id)) {
        throw ErrorHelper.notFound("Production order not found for this job.");
      }
    } else {
      sourceOrder = await productionOrderRepository.findOne({
        jobOrderId: job._id,
        cycleType: "ORIGINAL",
        status: { $ne: "CANCELLED" },
      });
    }

    if (sourceOrder) {
      const limit = sourceOrder.actualQty || sourceOrder.plannedQty || 0;
      if (limit > 0 && quantity > limit) {
        throw ErrorHelper.badRequest(
          `Reprint quantity (${quantity}) cannot exceed the produced quantity (${limit}).`
        );
      }
      const open = await reprintRequestRepository.findOne({
        productionOrderId: sourceOrder._id,
        status: { $in: OPEN_STATUSES },
      });
      if (open) {
        throw ErrorHelper.conflict(
          `A reprint request (${open.requestNo || open._id}) is already open for production order ${sourceOrder.productionNo}.`
        );
      }
    }

    // Cycle number: R1, R2, ... per job
    const existingCount = await reprintRequestRepository.countDocuments({ jobOrderId: job._id });
    const cycleNo = existingCount + 1;
    const restartCode = String(restartFromOperationCode || "PRINT").toUpperCase().trim();

    const reprintRequest = await reprintRequestRepository.create({
      jobOrderId: job._id,
      jobItemId: jobItemId || sourceOrder?.jobItemId || null,
      branchId: sourceOrder?.branchId || job.branchId || null,
      productionOrderId: sourceOrder ? sourceOrder._id : null,
      qualityCheckId: qualityCheckId || null,
      requestedBy: user._id,
      reason,
      defectType: String(defectType || "").trim(),
      quantity,
      sourceStage,
      restartFromOperationCode: restartCode,
      cycleNo,
      details: details || "",
      attachments: Array.isArray(attachments) ? attachments : [],
      status: "REQUESTED",
    });

    await ProductionStateService.logAudit({
      action: "REPRINT_REQUEST",
      resource: "ReprintRequest",
      resourceId: reprintRequest._id,
      user,
      branchId: reprintRequest.branchId,
      details: {
        requestNo: reprintRequest.requestNo,
        reason,
        quantity,
        sourceStage,
        restartFromOperationCode: restartCode,
        cycleNo,
        qualityCheckId,
      },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: job._id,
      productionOrderId: sourceOrder ? sourceOrder._id : null,
      eventType: "reprint.requested",
      stage: sourceStage,
      performedBy: user._id,
      details: { quantity, reason, cycleNo, restartFromOperationCode: restartCode },
    });

    await ProductionStateService.createNotification({
      role: "manager",
      branchId: reprintRequest.branchId,
      title: "Reprint Approval Required",
      message: `Reprint ${reprintRequest.requestNo || ""} requested for Job ${job.jobNo || job._id} (Cycle R${cycleNo}, ${quantity} units). Reason: ${reason}`,
      entityType: "REPRINT",
      entityId: reprintRequest._id,
    });

    return reprintRequest;
  }

  /**
   * Approve a reprint request (manager).
   * Creates a child production order (cycle R<n>) in status PLANNED, with
   * operations copied from the restart operation onward, so it appears in the
   * tracking queue. The original order is left as it is.
   */
  static async approve(reprintRequestId, approvalData = {}, user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to approve reprint.");
    }
    if (!isObjectId(reprintRequestId)) {
      throw ErrorHelper.badRequest(`Invalid reprint request ID: ${reprintRequestId}`);
    }
    const pre = await reprintRequestRepository.findById(reprintRequestId);
    if (pre) ProductionHelper.assertBranchAccess(pre.branchId, user, "Reprint Request");

    const { comments = "", markAsUrgent = false } = approvalData;

    // Atomic claim: two managers approving at once cannot both create a cycle
    const request = await reprintRequestRepository.findOneAndUpdate(
      { _id: reprintRequestId, status: { $in: WAITING_STATUSES } },
      {
        $set: {
          status: "APPROVED",
          approvedBy: user._id,
          approvedAt: new Date(),
          reopenedAt: new Date(),
          markAsUrgent: Boolean(markAsUrgent),
          managerComments: comments || "",
        },
      },
      { new: true }
    );

    if (!request) {
      const current = await reprintRequestRepository.findById(reprintRequestId);
      if (!current) {
        throw ErrorHelper.notFound(`Reprint Request not found with ID: ${reprintRequestId}`);
      }
      // Idempotent: already approved
      if (["APPROVED", "IN_PRODUCTION"].includes(current.status)) return current;
      throw ErrorHelper.badRequest(
        `Cannot approve reprint request with status '${current.status}'. Expected REQUESTED.`
      );
    }

    try {
      return await this.startReprintCycle(request, comments, user);
    } catch (err) {
      // Put the request back so it can be approved again
      await reprintRequestRepository.update(request._id, {
        status: "REQUESTED",
        approvedBy: null,
        approvedAt: null,
        reopenedAt: null,
      });
      throw err;
    }
  }

  static async startReprintCycle(request, comments, user) {
    const originalOrder = request.productionOrderId
      ? await productionOrderRepository.findById(request.productionOrderId)
      : await productionOrderRepository.findOne({
          jobOrderId: request.jobOrderId,
          cycleType: "ORIGINAL",
          status: { $ne: "CANCELLED" },
        });

    const job = await jobOrderRepository.findById(request.jobOrderId);
    const cycleNo = request.cycleNo || 1;
    const reprintQty = request.quantity;
    const branchId = originalOrder ? originalOrder.branchId : job?.branchId;
    const restartOpCode = (request.restartFromOperationCode || "PRINT").toUpperCase().trim();

    // Unique production number, e.g. PO-20261023-0001-R1
    const basePoNo = originalOrder ? originalOrder.productionNo : `PO-${Date.now()}`;
    let reprintPoNo = `${basePoNo}-R${cycleNo}`;
    let suffix = 1;
    while (await productionOrderRepository.findOne({ productionNo: reprintPoNo })) {
      reprintPoNo = `${basePoNo}-R${cycleNo}-${suffix++}`;
    }

    const reprintOrder = await productionOrderRepository.create({
      productionNo: reprintPoNo,
      jobOrderId: request.jobOrderId,
      jobItemId: request.jobItemId || originalOrder?.jobItemId || null,
      branchId,
      status: "PLANNED",
      planningStatus: "PLANNED",
      statusHistory: [
        {
          from: null,
          to: "PLANNED",
          reason: `Reprint ${request.requestNo || request._id} approved`,
          changedBy: user._id,
          changedAt: new Date(),
        },
      ],
      priority: request.markAsUrgent ? "URGENT" : originalOrder?.priority || "HIGH",
      plannedQty: reprintQty,
      actualQty: 0,
      plannedStart: new Date(),
      plannedEnd: originalOrder?.plannedEnd || job?.dueDate || null,
      cycleNo,
      cycleType: "REPRINT",
      parentProductionOrderId: originalOrder ? originalOrder._id : null,
      reprintRequestId: request._id,
      specificationsSnapshot: originalOrder?.specificationsSnapshot || {},
      approvedSample: originalOrder?.approvedSample || undefined,
      notes: `Reprint cycle R${cycleNo}. Reason: ${request.reason}.${comments ? ` Manager notes: ${comments}` : ""}`,
    });

    const baseOps = originalOrder ? await productionOperationRepository.findByProductionOrder(originalOrder._id) : [];
    const chain = buildChain(baseOps, restartOpCode);

    let seq = 1;
    const createdOps = await productionOperationRepository.insertMany(
      chain.map((step) => ({
        productionOrderId: reprintOrder._id,
        jobOrderId: request.jobOrderId,
        branchId,
        operationCode: step.code,
        operationName: `Reprint: ${step.name}`,
        sequenceNo: seq++,
        dependsOn: [],
        assignedEmployeeId: null,
        plannedQty: reprintQty,
        inputQty: reprintQty,
        completedQty: 0,
        status: "PENDING",
        isReprint: true,
        cycleNo,
        cycleType: "REPRINT",
        remarks: `Reprint cycle R${cycleNo} from ${restartOpCode}. Reason: ${request.reason}`,
      }))
    );

    request.status = "IN_PRODUCTION";
    await request.save();

    if (originalOrder) {
      await productionOrderRepository.findByIdAndUpdate(originalOrder._id, {
        $inc: { reprintedQty: reprintQty },
      });
    }

    // Job stage follows the restart operation
    let nextJobStage = "PRINTING";
    if (restartOpCode === "PACKING") nextJobStage = "PACKING";
    else if (restartOpCode !== "PRINT") nextJobStage = "FINISHING";
    await ProductionStateService.updateJobStage(request.jobOrderId, nextJobStage);

    await ProductionStateService.logAudit({
      action: "REPRINT_APPROVED",
      resource: "ReprintRequest",
      resourceId: request._id,
      user,
      branchId,
      details: {
        requestNo: request.requestNo,
        cycleNo,
        reprintProductionOrderId: reprintOrder._id,
        quantity: reprintQty,
        restartFromOperationCode: restartOpCode,
        operationsCreated: createdOps.length,
      },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: request.jobOrderId,
      productionOrderId: reprintOrder._id,
      eventType: "reprint.approved",
      stage: nextJobStage,
      performedBy: user._id,
      details: { cycleNo, quantity: reprintQty, restartFromOperationCode: restartOpCode },
    });

    await ProductionStateService.createNotification({
      role: "production",
      branchId,
      title: "Reprint Cycle Started",
      message: `Reprint cycle R${cycleNo} for Job ${job?.jobNo || request.jobOrderId} was approved and queued from ${restartOpCode}.`,
      entityType: "PRODUCTION",
      entityId: reprintOrder._id,
    });

    const ret = request.toObject();
    ret.productionOrder = { ...reprintOrder.toObject(), operations: createdOps };
    return ret;
  }

  static async approveReprintRequest(reprintRequestId, user, approvalData = {}) {
    return this.approve(reprintRequestId, approvalData, user);
  }

  /**
   * Reject a reprint request (manager). A reason is required.
   */
  static async reject(reprintRequestId, reason = "", user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to reject reprint.");
    }
    if (!isObjectId(reprintRequestId)) {
      throw ErrorHelper.badRequest(`Invalid reprint request ID: ${reprintRequestId}`);
    }

    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      throw ErrorHelper.badRequest("A rejection reason is required.");
    }
    const pre = await reprintRequestRepository.findById(reprintRequestId);
    if (pre) ProductionHelper.assertBranchAccess(pre.branchId, user, "Reprint Request");

    const request = await reprintRequestRepository.findOneAndUpdate(
      { _id: reprintRequestId, status: { $in: WAITING_STATUSES } },
      {
        $set: {
          status: "REJECTED",
          approvedBy: user._id,
          approvedAt: new Date(),
          rejectionReason: cleanReason,
          managerComments: cleanReason,
        },
      },
      { new: true }
    );

    if (!request) {
      const current = await reprintRequestRepository.findById(reprintRequestId);
      if (!current) {
        throw ErrorHelper.notFound(`Reprint Request not found with ID: ${reprintRequestId}`);
      }
      if (current.status === "REJECTED") return current;
      throw ErrorHelper.badRequest(`Cannot reject reprint request with status '${current.status}'.`);
    }

    // Per the workflow: a rejected reprint puts the job on hold for a decision
    await ProductionStateService.updateJobStage(request.jobOrderId, "ON_HOLD", "ON_HOLD");
    await jobOrderRepository.findByIdAndUpdate(request.jobOrderId, {
      $set: { status: "ON_HOLD", holdReason: cleanReason },
    });

    await ProductionStateService.logAudit({
      action: "REPRINT_REJECTED",
      resource: "ReprintRequest",
      resourceId: request._id,
      user,
      branchId: request.branchId,
      details: { requestNo: request.requestNo, rejectionReason: cleanReason },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: request.jobOrderId,
      eventType: "reprint.rejected",
      stage: request.sourceStage,
      performedBy: user._id,
      details: { reason: cleanReason },
    });

    return request;
  }

  /**
   * One reprint request with the production cycles of its job.
   * Each production order is one cycle (original, then R1, R2, ...).
   */
  static async findById(id, user = null) {
    if (!isObjectId(id)) {
      throw ErrorHelper.badRequest(`Invalid reprint request ID: ${id}`);
    }
    const request = await reprintRequestRepository
      .findById(id)
      .populate("requestedBy", "name email")
      .populate("approvedBy", "name email");
    if (!request) {
      throw ErrorHelper.notFound(`Reprint Request not found with ID: ${id}`);
    }

    const scoped = scopeBranch(null, user);
    if (scoped && request.branchId && String(request.branchId) !== scoped) {
      throw ErrorHelper.notFound(`Reprint Request not found with ID: ${id}`);
    }

    const job = await jobOrderRepository.findById(request.jobOrderId);
    const productionOrders = (
      await productionOrderRepository.find({
        jobOrderId: request.jobOrderId,
        status: { $ne: "CANCELLED" },
      })
    ).sort((a, b) => (a.cycleNo || 0) - (b.cycleNo || 0));

    const operations = await productionOperationRepository.findByProductionOrders(
      productionOrders.map((p) => p._id)
    );
    const qualityCheckRepository = require("../models/QualityCheck");
    const qcRecords = await qualityCheckRepository.findAll({ jobOrderId: request.jobOrderId, limit: 500 });
    const qcItems = qcRecords.items || [];

    const cycles = productionOrders.map((po) => {
      const poOps = operations.filter((o) => String(o.productionOrderId) === String(po._id));
      const poQc = qcItems.filter(
        (q) => String(q.productionOrderId?._id || q.productionOrderId) === String(po._id)
      );
      const isOriginal = (po.cycleNo || 0) === 0;
      return {
        cycleNo: po.cycleNo || 0,
        cycleType: po.cycleType || (isOriginal ? "ORIGINAL" : "REPRINT"),
        title: isOriginal
          ? `CYCLE 0 · ORIGINAL (${(po.plannedQty || 0).toLocaleString()})`
          : `CYCLE R${po.cycleNo} · REPRINT (${(po.plannedQty || 0).toLocaleString()})`,
        productionOrder: po,
        operations: poOps,
        qc: poQc[0] || null, // latest first
        status: po.status,
      };
    });

    // Not approved yet: preview the cycle that approval would create
    const hasCycle = cycles.some((c) => c.cycleType === "REPRINT" && c.cycleNo === request.cycleNo);
    if (!hasCycle && WAITING_STATUSES.includes(request.status)) {
      const source =
        productionOrders.find((p) => String(p._id) === String(request.productionOrderId)) ||
        productionOrders.find((p) => (p.cycleNo || 0) === 0);
      const sourceOps = source ? operations.filter((o) => String(o.productionOrderId) === String(source._id)) : [];
      const chain = buildChain(sourceOps, request.restartFromOperationCode || "PRINT");
      cycles.push({
        cycleNo: request.cycleNo,
        cycleType: "REPRINT",
        title: `CYCLE R${request.cycleNo} · REPRINT (${(request.quantity || 0).toLocaleString()})`,
        productionOrder: null,
        operations: chain.map((step, i) => ({
          operationCode: step.code,
          operationName: step.name,
          sequenceNo: i + 1,
          status: "PENDING",
        })),
        qc: null,
        status: request.status,
      });
    }

    const history = await reprintRequestRepository.findAll({
      jobOrderId: request.jobOrderId,
      limit: 500,
    });

    return {
      reprintRequest: request,
      jobOrder: job,
      productionOrder: productionOrders.find((p) => (p.cycleNo || 0) === 0) || productionOrders[0] || null,
      cycles,
      history: history.items || [],
    };
  }

  /**
   * List reprint requests (search, comma separated status, paging).
   */
  static async findAll(query = {}, user = null) {
    const scoped = { ...query };
    const branch = scopeBranch(query.branchId, user);
    if (branch) scoped.branchId = branch;
    return reprintRequestRepository.findAll(scoped);
  }
}

module.exports = ReprintService;