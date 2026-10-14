const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobItemRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobItemRepository");
const jobApprovalRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobApprovalRepository");
const jobFileRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobFileRepository");
const Estimate = require("../../../infrastructure/database/mongoose/models/estimate/Estimate");
const EstimateApproval = require("../../../infrastructure/database/mongoose/models/estimate/EstimateApproval");
const JobWorkflowService = require("./jobWorkflow.service");
const ProductionStateService = require("../production/productionState.service");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class JobEstimateService {
  /**
   * Helper to calculate subtotal, pro-rata tax, and grand total.
   */
  static calculateTotals(items, discount = 0) {
    let subtotal = 0;
    let tax = 0;

    const amounts = items.map((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.unitRate || it.unitPrice) || 0;
      const itemAmount = Math.round(qty * rate * 100) / 100;
      subtotal += itemAmount;
      const taxRate = Number(it.taxRate) || 0;
      tax += (itemAmount * taxRate) / 100;
      return itemAmount;
    });

    const disc = Number(discount) || 0;
    if (disc < 0 || disc > subtotal) {
      throw ErrorHelper.badRequest("Invalid discount: Discount cannot be negative or exceed subtotal.");
    }

    const factor = subtotal === 0 ? 1 : (subtotal - disc) / subtotal;
    const taxAmount = Math.round(tax * factor * 100) / 100;
    const grandTotal = Math.round((subtotal - disc + taxAmount) * 100) / 100;

    return { amounts, subtotal, discount: disc, taxAmount, grandTotal };
  }

  static assertDiscountAllowed(subtotal, discount, user) {
    if (discount > subtotal * 0.1) {
      const perms = user?.permissions || {};
      const canApproveHighDiscount =
        user?.role === "admin" ||
        perms["job.estimate.approve"] === true ||
        perms["job.estimate.approve"] === "ALL";
      if (!canApproveHighDiscount) {
        throw ErrorHelper.forbidden("Discount above 10% requires 'job.estimate.approve' permission.");
      }
    }
  }

  /**
   * Submit / update estimate for a Job Order.
   */
  static async estimate(jobId, estimateData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    if (!["ESTIMATION", "ESTIMATE_APPROVAL", "ENQUIRY"].includes(job.currentStage)) {
      throw ErrorHelper.conflict(`Cannot submit estimate at stage '${job.currentStage}'. Expected ESTIMATION.`);
    }

    const currentItems = await jobItemRepository.findByJobOrderId(job._id);
    const dtoItems = estimateData.items || [];
    const byLine = new Map(dtoItems.map((l) => [Number(l.lineNo), l]));

    for (const it of currentItems) {
      const l = byLine.get(it.lineNo);
      if (l) {
        if (l.unitRate !== undefined) {
          it.unitRate = Number(l.unitRate);
          it.unitPrice = Number(l.unitRate);
        }
        if (l.taxRate !== undefined) it.taxRate = Number(l.taxRate);
        it.amount = Math.round(it.quantity * it.unitRate * 100) / 100;
        it.totalPrice = it.amount;
        await it.save();
      }
    }

    const c = this.calculateTotals(
      currentItems,
      estimateData.discountAmount !== undefined ? estimateData.discountAmount : job.discountAmount
    );

    this.assertDiscountAllowed(c.subtotal, c.discount, user);

    job.subtotal = c.subtotal;
    job.taxAmount = c.taxAmount;
    job.discountAmount = c.discount;
    job.grandTotal = c.grandTotal;
    job.totalAmount = c.grandTotal;
    job.estimatedPrice = c.grandTotal;
    await job.save();

    // Expire older pending estimate approvals
    await jobApprovalRepository.updateMany(
      { jobOrderId: job._id, approvalType: "ESTIMATE", status: "PENDING" },
      { status: "EXPIRED", decisionAt: new Date() }
    );

    const versionCount = await jobApprovalRepository.countDocuments({
      jobOrderId: job._id,
      approvalType: "ESTIMATE",
    });
    const versionNo = versionCount + 1;
    const approvalNo = `APP-EST-${job.jobNo || job._id}-V${versionNo}`;

    await jobApprovalRepository.create({
      approvalNo,
      jobOrderId: job._id,
      approvalType: "ESTIMATE",
      versionNo,
      status: "PENDING",
      requestedFrom: job.customerId,
      requestedBy: user._id,
    });

    // Populate standalone estimates & estimateApprovals collections
    try {
      await EstimateApproval.updateMany(
        { jobOrderId: job._id, status: "PENDING" },
        { status: "EXPIRED", decidedAt: new Date() }
      );

      const estNo = `EST-${job.jobNo || String(job._id).slice(-6).toUpperCase()}-V${versionNo}`;
      const estimateRecord = await Estimate.create({
        estimateNo: estNo,
        jobOrderId: job._id,
        branchId: job.branchId,
        customerId: job.customerId,
        customerSnapshot: job.customerSnapshot || {},
        title: job.title || "Print Quotation",
        versionNo,
        status: "PENDING_APPROVAL",
        items: currentItems.map((it) => ({
          lineNo: it.lineNo || 1,
          itemName: it.itemName,
          description: it.description || "",
          quantity: it.quantity,
          unit: it.unit || "PCS",
          unitRate: it.unitRate,
          unitPrice: it.unitRate,
          taxRate: it.taxRate || 0,
          amount: it.amount || 0,
          totalPrice: it.totalPrice || it.amount || 0,
          paperSize: it.paperSize || "",
          paperType: it.paperType || "",
          printingType: it.printingType || "",
          colorMode: it.colorMode || "CMYK",
          sides: it.sides || "SINGLE",
          finishing: it.finishing || [],
          customerRequirements: it.customerRequirements || "",
          remarks: it.remarks || "",
        })),
        subtotal: c.subtotal,
        discountAmount: c.discount,
        taxAmount: c.taxAmount,
        grandTotal: c.grandTotal,
        createdBy: user._id,
      });

      const estApprovalRecord = await EstimateApproval.create({
        approvalNo,
        estimateId: estimateRecord._id,
        jobOrderId: job._id,
        versionNo,
        status: "PENDING",
        requestedFrom: job.customerId,
        requestedBy: user._id,
      });

      estimateRecord.currentApprovalId = estApprovalRecord._id;
      await estimateRecord.save();
    } catch (syncErr) {
      console.warn("Could not sync dedicated Estimate/EstimateApproval record:", syncErr.message);
    }

    const patch = { estimationStatus: "PENDING" };
    if (job.currentStage === "ESTIMATE_APPROVAL") {
      await JobWorkflowService.touch(job._id, {
        actorId: user._id,
        notes: `Estimate v${versionNo}`,
        patch,
        user,
      });
    } else {
      await JobWorkflowService.transition(job._id, "ESTIMATE_APPROVAL", {
        actorId: user._id,
        notes: `Estimate v${versionNo}`,
        patch,
        user,
      });
    }

    emitJobEvent("job.estimate.submitted", { jobId: String(job._id), versionNo });

    return jobOrderRepository.findById(job._id);
  }

  /**
   * Approve estimate approval request.
   */
  static async approveEstimate(jobId, approveData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    let approval = await jobApprovalRepository.findOne({
      jobOrderId: job._id,
      approvalType: "ESTIMATE",
      status: "PENDING",
    });

    if (!approval) {
      approval = await jobApprovalRepository.findOne(
        {
          jobOrderId: job._id,
          approvalType: "ESTIMATE",
        },
        { sort: { createdAt: -1 } }
      );

      if (!approval) {
        approval = await jobApprovalRepository.create({
          jobOrderId: job._id,
          approvalType: "ESTIMATE",
          status: "PENDING",
          requestedBy: job.createdBy || user._id,
          versionNo: 1,
        });
      }
    }

    const approvalComments = approveData.comments || approveData.remarks || "Estimate approved";
    approval.status = "APPROVED";
    approval.decisionAt = new Date();
    approval.decidedAt = new Date();
    approval.decisionBy = user._id;
    approval.decidedBy = user._id;
    approval.comments = approvalComments;

    const pricing = {};
    if (approveData.subtotal !== undefined) pricing.subtotal = Number(approveData.subtotal);
    if (approveData.discountAmount !== undefined) pricing.discountAmount = Number(approveData.discountAmount);
    if (approveData.discountPercent !== undefined) pricing.discountPercent = Number(approveData.discountPercent);
    if (approveData.taxRate !== undefined) pricing.taxRate = Number(approveData.taxRate);
    if (approveData.taxAmount !== undefined) pricing.taxAmount = Number(approveData.taxAmount);
    if (approveData.grandTotal !== undefined) pricing.grandTotal = Number(approveData.grandTotal);

    approval.approvedPricing = pricing;
    await approval.save();

    // Sync standalone EstimateApproval & Estimate collections
    try {
      await EstimateApproval.updateMany(
        { jobOrderId: job._id },
        {
          status: "APPROVED",
          decidedAt: new Date(),
          decidedBy: user._id,
          decisionAt: new Date(),
          decisionBy: user._id,
          comments: approvalComments,
        }
      );
      await Estimate.updateMany(
        { jobOrderId: job._id },
        {
          status: "APPROVED",
          approvedAt: new Date(),
          updatedBy: user._id,
        }
      );
    } catch (apprSyncErr) {
      console.warn("Could not sync approval to Estimate collections:", apprSyncErr.message);
    }

    let nextStage = "DESIGN_QUEUE";
    if (approveData.skipDesign) {
      const countPrintReady = await jobFileRepository.countDocuments({
        jobOrderId: job._id,
        fileCategory: "PRINT_READY",
      });
      if (countPrintReady < 1) {
        throw ErrorHelper.unprocessableEntity(
          "PRINT_READY_FILE_REQUIRED: Please upload a PRINT_READY file before skipping design."
        );
      }
      nextStage = "PRODUCTION_PLANNING";
    }

    const patch = {
      estimationStatus: "APPROVED",
      ...(pricing.subtotal !== undefined ? { subtotal: pricing.subtotal } : {}),
      ...(pricing.discountAmount !== undefined ? { discountAmount: pricing.discountAmount } : {}),
      ...(pricing.discountPercent !== undefined ? { discountPercent: pricing.discountPercent } : {}),
      ...(pricing.taxRate !== undefined ? { taxRate: pricing.taxRate } : {}),
      ...(pricing.taxAmount !== undefined ? { taxAmount: pricing.taxAmount } : {}),
      ...(pricing.grandTotal !== undefined
        ? {
            grandTotal: pricing.grandTotal,
            totalAmount: pricing.grandTotal,
            estimatedPrice: pricing.grandTotal,
          }
        : {}),
      approvedPricing: pricing,
    };

    let updated;
    try {
      updated = await JobWorkflowService.transition(job._id, nextStage, {
        actorId: user._id,
        notes: approvalComments,
        reason: approveData.skipDesign ? "DESIGN_SKIPPED" : undefined,
        patch,
        user,
      });
    } catch (transErr) {
      console.warn("Workflow transition error, applying direct patch:", transErr.message);
      updated = await jobOrderRepository.update(job._id, {
        ...patch,
        currentStage: nextStage,
        stage: nextStage,
        status: nextStage === "PRODUCTION_PLANNING" ? "PRODUCTION" : "DESIGN",
      });
    }

    // Ensure all pricing fields are persisted on the job
    await jobOrderRepository.update(job._id, patch);

    await ProductionStateService.logAudit({
      action: "APPROVE",
      resource: "JobEstimate",
      resourceId: job._id,
      user,
      branchId: job.branchId,
      details: {
        versionNo: approval.versionNo,
        skipDesign: Boolean(approveData.skipDesign),
        pricing,
      },
    });

    emitJobEvent("job.estimate.approved", { jobId: String(job._id), versionNo: approval.versionNo });
    return updated;
  }

  /**
   * Reject estimate approval request.
   */
  static async rejectEstimate(jobId, rejectData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    let approval = await jobApprovalRepository.findOne({
      jobOrderId: job._id,
      approvalType: "ESTIMATE",
      status: "PENDING",
    });

    const rejectionReason = rejectData.rejectionReason || rejectData.reason || "Estimate rejected";

    if (!approval) {
      approval = await jobApprovalRepository.findOne(
        {
          jobOrderId: job._id,
          approvalType: "ESTIMATE",
        },
        { sort: { createdAt: -1 } }
      );

      if (!approval) {
        approval = await jobApprovalRepository.create({
          jobOrderId: job._id,
          approvalType: "ESTIMATE",
          status: "REJECTED",
          requestedBy: job.createdBy || user._id,
          decisionBy: user._id,
          decidedBy: user._id,
          decisionAt: new Date(),
          decidedAt: new Date(),
          rejectionReason,
          comments: rejectionReason,
          versionNo: 1,
        });
      }
    }

    if (approval) {
      approval.status = "REJECTED";
      approval.decisionAt = new Date();
      approval.decidedAt = new Date();
      approval.decisionBy = user._id;
      approval.decidedBy = user._id;
      approval.rejectionReason = rejectionReason;
      approval.comments = rejectionReason;
      await approval.save();
    }

    // Sync standalone EstimateApproval & Estimate collections
    try {
      await EstimateApproval.updateMany(
        { jobOrderId: job._id },
        {
          status: "REJECTED",
          decidedAt: new Date(),
          decidedBy: user._id,
          decisionAt: new Date(),
          decisionBy: user._id,
          rejectionReason,
          comments: rejectionReason,
        }
      );
      await Estimate.updateMany(
        { jobOrderId: job._id },
        {
          status: "REJECTED",
          rejectedAt: new Date(),
          updatedBy: user._id,
          revisionNotes: rejectionReason,
        }
      );
    } catch (rejSyncErr) {
      console.warn("Could not sync rejection to Estimate collections:", rejSyncErr.message);
    }

    const patch = {
      estimationStatus: "REJECTED",
      status: "REVISION",
      rejectionReason,
    };

    let updated;
    try {
      if (job.currentStage === "ESTIMATE_APPROVAL") {
        updated = await JobWorkflowService.transition(job._id, "ESTIMATION", {
          actorId: user._id,
          reason: rejectionReason,
          patch,
          user,
        });
      } else {
        updated = await jobOrderRepository.update(job._id, patch);
      }
    } catch (transErr) {
      console.warn("Transition error during estimate reject, updating directly:", transErr.message);
      updated = await jobOrderRepository.update(job._id, patch);
    }

    await ProductionStateService.logAudit({
      action: "REJECT",
      resource: "JobEstimate",
      resourceId: job._id,
      user,
      branchId: job.branchId,
      details: { reason: rejectionReason },
    });

    emitJobEvent("job.estimate.rejected", { jobId: String(job._id) });

    if (rejectData.cancel) {
      await JobWorkflowService.cancel(job._id, rejectionReason, user._id);
    }

    return updated;
  }
}

module.exports = JobEstimateService;
