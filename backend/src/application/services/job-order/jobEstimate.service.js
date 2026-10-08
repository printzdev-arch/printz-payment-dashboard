const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobItemRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobItemRepository");
const jobApprovalRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobApprovalRepository");
const jobFileRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobFileRepository");
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

    const approval = await jobApprovalRepository.findOne({
      jobOrderId: job._id,
      approvalType: "ESTIMATE",
      status: "PENDING",
    });

    if (job.currentStage !== "ESTIMATE_APPROVAL" || !approval) {
      throw ErrorHelper.conflict("No pending estimate approval for this job.");
    }

    approval.status = "APPROVED";
    approval.decisionAt = new Date();
    approval.decisionBy = user._id;
    approval.decidedBy = user._id;
    approval.comments = approveData.comments || "Estimate approved";
    await approval.save();

    let nextStage = "DESIGN_QUEUE";
    if (approveData.skipDesign) {
      // Must have PRINT_READY file
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

    const updated = await JobWorkflowService.transition(job._id, nextStage, {
      actorId: user._id,
      notes: approveData.comments || "",
      reason: approveData.skipDesign ? "DESIGN_SKIPPED" : undefined,
      patch: { estimationStatus: "APPROVED" },
      user,
    });

    await ProductionStateService.logAudit({
      action: "APPROVE",
      resource: "JobEstimate",
      resourceId: job._id,
      user,
      branchId: job.branchId,
      details: { versionNo: approval.versionNo, skipDesign: Boolean(approveData.skipDesign) },
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

    const approval = await jobApprovalRepository.findOne({
      jobOrderId: job._id,
      approvalType: "ESTIMATE",
      status: "PENDING",
    });

    if (job.currentStage !== "ESTIMATE_APPROVAL" || !approval) {
      throw ErrorHelper.conflict("No pending estimate approval for this job.");
    }

    const rejectionReason = rejectData.rejectionReason || rejectData.reason || "Estimate rejected";
    approval.status = "REJECTED";
    approval.decisionAt = new Date();
    approval.decisionBy = user._id;
    approval.decidedBy = user._id;
    approval.rejectionReason = rejectionReason;
    await approval.save();

    const updated = await JobWorkflowService.transition(job._id, "ESTIMATION", {
      actorId: user._id,
      reason: rejectionReason,
      patch: { estimationStatus: "REJECTED" },
      user,
    });

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
