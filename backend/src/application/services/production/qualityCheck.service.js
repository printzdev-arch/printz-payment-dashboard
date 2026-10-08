const qualityCheckRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoQualityCheckRepository");
const productionOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOrderRepository");
const deliveryOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoDeliveryOrderRepository");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoJobOrderRepository");
const productionStateRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionStateRepository");
const ReworkService = require("./rework.service");
const ReprintService = require("./reprint.service");
const ProductionStateService = require("./productionState.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class QualityCheckService {
  /**
   * Get production orders pending QC inspection
   */
  static async getPending(branchId = null) {
    return qualityCheckRepository.findPending(branchId);
  }

  /**
   * Perform Quality Check on a Production Order
   */
  static async performCheck(productionOrderId, checkData = {}, user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required to perform QC check.");
    }

    const order = await productionOrderRepository.findById(productionOrderId);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${productionOrderId}`);
    }

    if (order.status !== "QC" && order.status !== "IN_PROGRESS") {
      throw ErrorHelper.badRequest(`Cannot perform QC on an order in status '${order.status}'. Expected QC.`);
    }

    const {
      checkType = "FINAL",
      result, // PASS, ISSUE, FAIL, CONDITIONAL
      quantityChecked,
      acceptedQty,
      rejectedQty = 0,
      defects = [],
      issueDetails = "",
      correctiveAction = null, // REWORK, REPRINT, NONE
      reprintQuantity = null,
      reworkOperationCode = "PRINT",
      restartFromOperationCode = "PRINT",
      comments = "",
      checklist = [],
      details = "",
      attachments = [],
    } = checkData;

    if (!result) {
      throw ErrorHelper.badRequest("QC result (PASS or ISSUE) is required.");
    }

    const isPass = result === "PASS" || result === "CONDITIONAL";

    const qChecked = quantityChecked !== undefined ? Number(quantityChecked) : Number(order.plannedQty || 0);
    const qAccepted = acceptedQty !== undefined ? Number(acceptedQty) : (isPass ? qChecked : 0);
    const qRejected = rejectedQty !== undefined ? Number(rejectedQty) : (isPass ? 0 : qChecked);

    if (qChecked < 0 || qAccepted < 0 || qRejected < 0) {
      throw ErrorHelper.badRequest("Quantities cannot be negative.");
    }

    if (qAccepted + qRejected !== qChecked) {
      throw ErrorHelper.badRequest(
        `Quantity mismatch: acceptedQty (${qAccepted}) + rejectedQty (${qRejected}) must equal quantityChecked (${qChecked}).`
      );
    }

    // Normalize checklist items for backward and forward compatibility
    const normalizedChecklist = checklist.map((item) => {
      const resVal = item.result || (item.passed === false ? "FAIL" : "PASS");
      return {
        item: item.item || "",
        result: ["PASS", "FAIL", "NA"].includes(resVal) ? resVal : "PASS",
        passed: resVal === "PASS" || resVal === "NA",
        notes: item.notes || "",
      };
    });

    const qualityCheck = await qualityCheckRepository.create({
      productionOrderId: order._id,
      jobOrderId: order.jobOrderId,
      jobItemId: order.jobItemId,
      checkType,
      checkedBy: user._id,
      checkedAt: new Date(),
      result: isPass ? "PASS" : "ISSUE",
      quantityChecked: qChecked,
      acceptedQty: qAccepted,
      rejectedQty: qRejected,
      defects,
      issueDetails,
      correctiveAction,
      reworkOperationCode: correctiveAction === "REWORK" ? reworkOperationCode : null,
      restartFromOperationCode: correctiveAction === "REPRINT" ? restartFromOperationCode : null,
      comments,
      checklist: normalizedChecklist,
    });

    if (isPass) {
      // 1. Mark Production Order COMPLETED
      order.status = "COMPLETED";
      order.actualEnd = new Date();
      if (acceptedQty !== undefined) order.actualQty = acceptedQty;
      await productionOrderRepository.save(order);

      // If this production order belongs to a reprint request, complete that reprint request
      const MongoReprintRequestRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoReprintRequestRepository");
      if (order.reprintRequestId) {
        await MongoReprintRequestRepository.update(order.reprintRequestId, {
          status: "COMPLETED",
          completedAt: new Date(),
        });
      }

      if (order.parentProductionOrderId) {
        await productionOrderRepository.update(order.parentProductionOrderId, {
          status: "COMPLETED",
          actualEnd: new Date(),
        });
      }

      // 2. Check if all Production Orders for this Job are COMPLETED and no open reprint requests
      const [siblingOrders, openReprints] = await Promise.all([
        productionOrderRepository.find({
          jobOrderId: order.jobOrderId,
          status: { $ne: "CANCELLED" },
        }),
        MongoReprintRequestRepository.find({
          jobOrderId: order.jobOrderId,
          status: { $in: ["REQUESTED", "APPROVED", "IN_PRODUCTION"] },
        }),
      ]);

      const hasActiveUncompletedOrders = siblingOrders.some((o) => {
        if (o._id.toString() === order._id.toString()) return false;
        if (order.parentProductionOrderId && o._id.toString() === order.parentProductionOrderId.toString()) return false;
        return o.status !== "COMPLETED";
      });

      const allOrdersCompleted = !hasActiveUncompletedOrders && (!openReprints || openReprints.length === 0);

      if (allOrdersCompleted) {
        // Update JobOrder stage -> READY
        await ProductionStateService.updateJobStage(order.jobOrderId, "READY", "READY");

        // Create Delivery Order in READY status
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const countDeliveries = await deliveryOrderRepository.countDocuments();
        const deliveryNo = `DO-${datePrefix}-${String(countDeliveries + 1).padStart(4, "0")}`;

        const job = await jobOrderRepository.findById(order.jobOrderId);

        await deliveryOrderRepository.upsert(
          { jobOrderId: order.jobOrderId },
          {
            deliveryNo,
            jobOrderId: order.jobOrderId,
            branchId: order.branchId,
            customerId: job?.customerId || null,
            customerName: job?.customerName || "Customer",
            quantity: order.actualQty || order.plannedQty,
            status: "READY",
          }
        );

        // Record Job Approval
        await productionStateRepository.createJobApproval({
          jobOrderId: order.jobOrderId,
          productionOrderId: order._id,
          approvalType: "QC",
          status: "APPROVED",
          decidedBy: user._id,
          decidedAt: new Date(),
          remarks: comments || "QC Passed",
        });

        await ProductionStateService.createNotification({
          role: "manager",
          branchId: order.branchId,
          title: "Job Ready for Delivery",
          message: `Job ${job?.jobNo || order.jobOrderId} has passed QC and is ready for invoice and delivery.`,
          entityType: "JOB",
          entityId: order.jobOrderId,
        });
      }

      await ProductionStateService.logAudit({
        action: "QC_PASS",
        resource: "QualityCheck",
        resourceId: qualityCheck._id,
        user,
        branchId: order.branchId,
        details: { result, acceptedQty, rejectedQty },
      });

      await ProductionStateService.dispatchWorkflowEvent({
        jobOrderId: order.jobOrderId,
        productionOrderId: order._id,
        eventType: "qc.passed",
        stage: "QC",
        performedBy: user._id,
        details: { acceptedQty },
      });
    } else {
      // QC ISSUE
      await productionStateRepository.createJobApproval({
        jobOrderId: order.jobOrderId,
        productionOrderId: order._id,
        approvalType: "QC",
        status: "REJECTED",
        decidedBy: user._id,
        decidedAt: new Date(),
        remarks: issueDetails || comments || "QC Issue identified",
      });

      let createdReprintReq = null;
      if (correctiveAction === "REWORK") {
        await ReworkService.triggerRework({
          productionOrderId: order._id,
          reworkOperationCode: reworkOperationCode || "PRINT",
          quantity: rejectedQty || order.plannedQty,
          reason: issueDetails || comments,
          user,
        });
      } else if (correctiveAction === "REPRINT") {
        createdReprintReq = await ReprintService.createRequest(
          order.jobOrderId,
          {
            jobItemId: order.jobItemId,
            productionOrderId: order._id,
            reason: issueDetails || comments || "Defects detected during QC",
            quantity: Number(reprintQuantity) || Number(rejectedQty) || 1,
            sourceStage: "QC",
            restartFromOperationCode: restartFromOperationCode || "PRINT",
            details: details || issueDetails,
            attachments,
          },
          user
        );
        qualityCheck.reprintRequestId = createdReprintReq._id;
        await qualityCheck.save();
      }

      await ProductionStateService.logAudit({
        action: "QC_ISSUE",
        resource: "QualityCheck",
        resourceId: qualityCheck._id,
        user,
        branchId: order.branchId,
        details: { correctiveAction, rejectedQty, defects },
      });

      await ProductionStateService.dispatchWorkflowEvent({
        jobOrderId: order.jobOrderId,
        productionOrderId: order._id,
        eventType: "qc.issue",
        stage: "QC",
        performedBy: user._id,
        details: { correctiveAction, issueDetails },
      });

      await ProductionStateService.createNotification({
        role: "manager",
        branchId: order.branchId,
        title: "QC Issue Reported",
        message: `QC issue logged for Production Order ${order.productionNo}. Corrective action: ${correctiveAction || "None"}.`,
        entityType: "QC",
        entityId: qualityCheck._id,
      });

      const ret = qualityCheck.toObject ? qualityCheck.toObject() : { ...qualityCheck };
      if (createdReprintReq) ret.reprintRequest = createdReprintReq;
      return ret;
    }

    return qualityCheck;
  }

  /**
   * List quality checks
   */
  static async findAll(query = {}) {
    return qualityCheckRepository.findAll(query);
  }

  /**
   * Get single QC check by ID
   */
  static async findById(id) {
    const qc = await qualityCheckRepository.findById(id);

    if (!qc) {
      throw ErrorHelper.notFound(`Quality Check not found with ID: ${id}`);
    }

    return qc;
  }

  /**
   * Get QC Report data
   */
  static async getReport(id) {
    const qc = await this.findById(id);
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
