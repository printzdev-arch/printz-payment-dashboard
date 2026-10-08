const reprintRequestRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoReprintRequestRepository");
const productionOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOrderRepository");
const productionOperationRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOperationRepository");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoJobOrderRepository");
const ProductionStateService = require("./productionState.service");
const RoundRobinService = require("./roundRobin.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class ReprintService {
  /**
   * Request a reprint
   */
  static async createRequest(jobOrderId, requestData = {}, user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to request reprint.");
    }

    const job = await jobOrderRepository.findById(jobOrderId);
    if (!job) {
      throw ErrorHelper.notFound(`Job Order not found with ID: ${jobOrderId}`);
    }

    const {
      jobItemId,
      productionOrderId,
      reason,
      quantity,
      sourceStage = "QC",
      restartFromOperationCode = "PRINT",
      details = "",
      attachments = [],
    } = requestData;

    if (!reason) {
      throw ErrorHelper.badRequest("Reason is required for reprint request.");
    }
    if (!quantity || Number(quantity) <= 0) {
      throw ErrorHelper.badRequest("Valid positive reprint quantity is required.");
    }

    // Determine cycleNo (e.g. 1 for R1, 2 for R2)
    const existingCount = await reprintRequestRepository.countDocuments({ jobOrderId: job._id });
    const cycleNo = existingCount + 1;

    const reprintRequest = await reprintRequestRepository.create({
      jobOrderId: job._id,
      jobItemId: jobItemId || null,
      productionOrderId: productionOrderId || null,
      requestedBy: user._id,
      reason,
      quantity: Number(quantity),
      sourceStage,
      restartFromOperationCode: (restartFromOperationCode || "PRINT").toUpperCase().trim(),
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
      branchId: job.branchId,
      details: {
        reason,
        quantity: reprintRequest.quantity,
        sourceStage,
        restartFromOperationCode: reprintRequest.restartFromOperationCode,
        cycleNo,
      },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: job._id,
      productionOrderId: productionOrderId || null,
      eventType: "reprint.requested",
      stage: sourceStage,
      performedBy: user._id,
      details: {
        quantity: reprintRequest.quantity,
        reason,
        cycleNo,
        restartFromOperationCode: reprintRequest.restartFromOperationCode,
      },
    });

    await ProductionStateService.createNotification({
      role: "manager",
      branchId: job.branchId,
      title: "Reprint Approval Required",
      message: `Reprint requested for Job ${job.jobNo || job._id} (Cycle R${cycleNo}, ${quantity} units). Reason: ${reason}`,
      entityType: "REPRINT",
      entityId: reprintRequest._id,
    });

    return reprintRequest;
  }

  /**
   * Approve a reprint request
   * Creates a new Production Cycle (ProductionOrder + Operations) starting strictly from restartFromOperationCode.
   */
  static async approve(reprintRequestId, approvalData = {}, user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to approve reprint.");
    }

    const request = await reprintRequestRepository.findById(reprintRequestId);
    if (!request) {
      throw ErrorHelper.notFound(`Reprint Request not found with ID: ${reprintRequestId}`);
    }

    if (request.status !== "REQUESTED") {
      throw ErrorHelper.badRequest(
        `Cannot approve reprint request with status '${request.status}'. Expected REQUESTED.`
      );
    }

    const { comments = "", markAsUrgent = false } = approvalData;

    request.status = "APPROVED";
    request.approvedBy = user._id;
    request.approvedAt = new Date();
    request.reopenedAt = new Date();
    request.markAsUrgent = Boolean(markAsUrgent);
    request.managerComments = comments || "";

    // Find original Production Order
    let originalOrder = null;
    if (request.productionOrderId) {
      originalOrder = await productionOrderRepository.findById(request.productionOrderId);
    }
    if (!originalOrder) {
      originalOrder = await productionOrderRepository.findOne({
        jobOrderId: request.jobOrderId,
        status: { $ne: "CANCELLED" },
      });
    }

    const cycleNo = request.cycleNo || 1;
    const reprintQty = request.quantity;
    const branchId = originalOrder ? originalOrder.branchId : null;
    const targetItemId = request.jobItemId || (originalOrder ? originalOrder.jobItemId : null);

    const job = await jobOrderRepository.findById(request.jobOrderId);
    const jobItem = job?.items?.find((i) => String(i._id) === String(targetItemId));

    // Build unique production number for reprint cycle: e.g. PO-YYYYMMDD-XXXX-R1
    const basePoNo = originalOrder ? originalOrder.productionNo : `PO-${Date.now()}`;
    const reprintPoNo = `${basePoNo}-R${cycleNo}`;

    // Create New ProductionOrder for Reprint Cycle
    const reprintProductionOrder = await productionOrderRepository.create({
      productionNo: reprintPoNo,
      jobOrderId: request.jobOrderId,
      jobItemId: targetItemId,
      branchId: branchId || job?.branchId,
      status: "IN_PROGRESS",
      priority: request.markAsUrgent ? "URGENT" : (originalOrder?.priority || "HIGH"),
      plannedQty: reprintQty,
      actualQty: 0,
      plannedStart: new Date(),
      actualStart: new Date(),
      cycleNo,
      cycleType: "REPRINT",
      parentProductionOrderId: originalOrder ? originalOrder._id : null,
      reprintRequestId: request._id,
      notes: `Reprint Cycle R${cycleNo}. Reason: ${request.reason}. ${comments ? `Manager notes: ${comments}` : ""}`,
    });

    // Determine sequence of operations starting from restartFromOperationCode
    const restartOpCode = (request.restartFromOperationCode || "PRINT").toUpperCase().trim();
    const opsToGenerate = [];

    if (restartOpCode === "PRINT") {
      opsToGenerate.push({ code: "PRINT", name: "Reprint: Printing" });
      if (jobItem && jobItem.finishing && Array.isArray(jobItem.finishing)) {
        for (const f of jobItem.finishing) {
          const fCode = (f.code || "FINISHING").toUpperCase().trim();
          opsToGenerate.push({ code: fCode, name: `Reprint: ${f.name || fCode}` });
        }
      }
      opsToGenerate.push({ code: "PACKING", name: "Reprint: Packaging" });
    } else if (restartOpCode === "PACKING") {
      opsToGenerate.push({ code: "PACKING", name: "Reprint: Packaging" });
    } else {
      // Starting from a finishing stage
      opsToGenerate.push({ code: restartOpCode, name: `Reprint: ${restartOpCode}` });
      if (jobItem && jobItem.finishing && Array.isArray(jobItem.finishing)) {
        let foundTarget = false;
        for (const f of jobItem.finishing) {
          const fCode = (f.code || "FINISHING").toUpperCase().trim();
          if (foundTarget) {
            opsToGenerate.push({ code: fCode, name: `Reprint: ${f.name || fCode}` });
          } else if (fCode === restartOpCode) {
            foundTarget = true;
          }
        }
      }
      opsToGenerate.push({ code: "PACKING", name: "Reprint: Packaging" });
    }

    let seq = 1;
    const createdOps = [];

    for (const opDef of opsToGenerate) {
      const operator = await RoundRobinService.getNextEmployee(branchId || job?.branchId, opDef.code);
      const newOp = await productionOperationRepository.create({
        productionOrderId: reprintProductionOrder._id,
        jobOrderId: request.jobOrderId,
        branchId: branchId || job?.branchId,
        operationCode: opDef.code,
        operationName: opDef.name,
        sequenceNo: seq++,
        assignedEmployeeId: operator ? operator._id : null,
        plannedQty: reprintQty,
        inputQty: reprintQty,
        status: "PENDING",
        isReprint: true,
        cycleNo,
        cycleType: "REPRINT",
        remarks: `Reprint cycle R${cycleNo} starting from ${restartOpCode}. Reason: ${request.reason}`,
      });
      createdOps.push(newOp);
    }

    request.status = "IN_PRODUCTION";
    await request.save();

    // Update job stage
    let nextJobStage = "PRINTING";
    if (restartOpCode === "PACKING") nextJobStage = "PACKING";
    else if (restartOpCode !== "PRINT") nextJobStage = "FINISHING";
    await ProductionStateService.updateJobStage(request.jobOrderId, nextJobStage);

    await ProductionStateService.logAudit({
      action: "REPRINT_APPROVED",
      resource: "ReprintRequest",
      resourceId: request._id,
      user,
      details: {
        cycleNo,
        reprintProductionOrderId: reprintProductionOrder._id,
        quantity: request.quantity,
        restartFromOperationCode: restartOpCode,
        operationsCreated: createdOps.length,
      },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: request.jobOrderId,
      productionOrderId: reprintProductionOrder._id,
      eventType: "reprint.approved",
      stage: nextJobStage,
      performedBy: user._id,
      details: {
        cycleNo,
        quantity: request.quantity,
        restartFromOperationCode: restartOpCode,
      },
    });

    await ProductionStateService.createNotification({
      role: "production",
      branchId: branchId || job?.branchId,
      title: "Reprint Cycle Started",
      message: `Reprint Cycle R${cycleNo} for Job ${job?.jobNo || request.jobOrderId} has been approved and queued from ${restartOpCode}.`,
      entityType: "PRODUCTION",
      entityId: reprintProductionOrder._id,
    });

    const ret = request.toObject ? request.toObject() : { ...request };
    ret.productionOrder = {
      ...(reprintProductionOrder.toObject ? reprintProductionOrder.toObject() : reprintProductionOrder),
      operations: createdOps,
    };
    return ret;
  }

  static async approveReprintRequest(reprintRequestId, user, approvalData = {}) {
    return this.approve(reprintRequestId, approvalData, user);
  }

  /**
   * Reject a reprint request
   */
  static async reject(reprintRequestId, reason = "", user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to reject reprint.");
    }

    const request = await reprintRequestRepository.findById(reprintRequestId);
    if (!request) {
      throw ErrorHelper.notFound(`Reprint Request not found with ID: ${reprintRequestId}`);
    }

    if (request.status !== "REQUESTED") {
      throw ErrorHelper.badRequest(`Cannot reject reprint request with status '${request.status}'.`);
    }

    request.status = "REJECTED";
    request.approvedBy = user._id;
    request.approvedAt = new Date();
    request.rejectionReason = reason || "Reprint rejected by manager";
    request.managerComments = reason || "";
    await request.save();

    await ProductionStateService.logAudit({
      action: "REPRINT_REJECTED",
      resource: "ReprintRequest",
      resourceId: request._id,
      user,
      details: { rejectionReason: request.rejectionReason },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: request.jobOrderId,
      eventType: "reprint.rejected",
      stage: request.sourceStage,
      performedBy: user._id,
      details: { reason },
    });

    return request;
  }

  /**
   * Get single reprint request details with cycle breakdown & history
   */
  static async findById(id) {
    const request = await reprintRequestRepository.findById(id);
    if (!request) {
      throw ErrorHelper.notFound(`Reprint Request not found with ID: ${id}`);
    }

    // Fetch parent JobOrder, all ProductionOrders (cycles), and their operations
    const job = await jobOrderRepository.findById(request.jobOrderId);
    const productionOrders = await productionOrderRepository.find({
      jobOrderId: request.jobOrderId,
    });

    const poIds = productionOrders.map((p) => p._id);
    const operations = await productionOperationRepository.findByProductionOrders(poIds);
    const qualityCheckRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoQualityCheckRepository");
    const qcRecords = await qualityCheckRepository.findAll({ jobOrderId: request.jobOrderId });

    // Group operations and QC by cycle
    const cycles = [];

    // 1. Cycle 0 (Original)
    const originalPo = productionOrders.find((p) => p.cycleNo === 0) || productionOrders[0];
    if (originalPo) {
      const cycle0Ops = operations.filter(
        (o) => String(o.productionOrderId) === String(originalPo._id) && (!o.cycleNo || o.cycleNo === 0)
      );
      const cycle0Qc = (qcRecords.items || []).filter(
        (q) => String(q.productionOrderId?._id || q.productionOrderId) === String(originalPo._id)
      );

      cycles.push({
        cycleNo: 0,
        cycleType: "ORIGINAL",
        title: `CYCLE 0 · ORIGINAL (${(originalPo.plannedQty || 1000).toLocaleString()})`,
        productionOrder: originalPo,
        operations: cycle0Ops,
        qc: cycle0Qc[0] || null,
        status: originalPo.status,
      });
    }

    // 2. Additional Reprint Cycles
    const reprintPos = productionOrders.filter((p) => (p.cycleNo || 0) > 0);
    reprintPos.sort((a, b) => a.cycleNo - b.cycleNo);

    reprintPos.forEach((rPo) => {
      const rOps = operations.filter(
        (o) => String(o.productionOrderId) === String(rPo._id) || o.cycleNo === rPo.cycleNo
      );
      const rQc = (qcRecords.items || []).filter(
        (q) => String(q.productionOrderId?._id || q.productionOrderId) === String(rPo._id)
      );

      cycles.push({
        cycleNo: rPo.cycleNo,
        cycleType: "REPRINT",
        title: `CYCLE R${rPo.cycleNo} · REPRINT (${(rPo.plannedQty || request.quantity).toLocaleString()})`,
        productionOrder: rPo,
        operations: rOps,
        qc: rQc[0] || null,
        status: rPo.status,
      });
    });

    // If current request is not yet in production, create a preview cycle for it
    const hasCurrentInCycles = cycles.some((c) => c.cycleNo === request.cycleNo && c.cycleType === "REPRINT");
    if (!hasCurrentInCycles && request.status === "REQUESTED") {
      cycles.push({
        cycleNo: request.cycleNo,
        cycleType: "REPRINT",
        title: `CYCLE R${request.cycleNo} · REPRINT (${(request.quantity || 50).toLocaleString()})`,
        productionOrder: null,
        operations: [
          { operationCode: "PRINT", operationName: "Printing", status: "REOPENED" },
          { operationCode: "LAMINATION", operationName: "Lamination", status: "PENDING" },
          { operationCode: "CUTTING", operationName: "Cutting", status: "PENDING" },
          { operationCode: "PACKING", operationName: "Packing", status: "PENDING" },
          { operationCode: "QC", operationName: "QC", status: "PENDING" },
        ],
        qc: null,
        status: "REQUESTED",
      });
    }

    // Fetch reprint history for this job
    const allReprintRequests = await reprintRequestRepository.findAll({
      jobOrderId: request.jobOrderId,
    });

    return {
      reprintRequest: request,
      jobOrder: job,
      productionOrder: originalPo,
      cycles,
      history: allReprintRequests.items || [],
    };
  }

  /**
   * List reprint requests with filters
   */
  static async findAll(query = {}) {
    return reprintRequestRepository.findAll(query);
  }
}

module.exports = ReprintService;
