const jobOrderRepository = require("../models/JobOrder");
const jobItemRepository = require("../models/JobItem");
const jobApprovalRepository = require("../models/JobApproval");
const jobFileRepository = require("../models/JobFile");
const Estimate = require("../../estimates/models/Estimate");
const EstimateApproval = require("../../estimates/models/EstimateApproval");
const JobWorkflowService = require("./jobWorkflow.service");
const ProductionStateService = require("../../production/services/productionState.service");
const { emitJobEvent } = require("../events/jobEvents.emitter");
const ErrorHelper = require("../../../utils/ApiError");

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

    // Persist additional line items passed from frontend (e.g. finishing services lineNo 2, 3, etc.)
    for (const dtoItem of dtoItems) {
      const lineNo = Number(dtoItem.lineNo || 1);
      const exists = currentItems.some((it) => it.lineNo === lineNo);
      if (!exists) {
        const qty = Number(dtoItem.quantity || dtoItem.qty || 1);
        const rate = Number(dtoItem.unitRate || dtoItem.unitPrice || dtoItem.rate || 0);
        const itemAmount = Number(dtoItem.amount || (qty * rate));
        const createdLine = await jobItemRepository.create({
          jobOrderId: job._id,
          lineNo,
          itemType: "FINISHING",
          itemName: dtoItem.itemName || dtoItem.name || "Finishing Service",
          description: dtoItem.description || dtoItem.spec || "",
          quantity: qty,
          unit: dtoItem.unit || "PCS",
          unitRate: rate,
          unitPrice: rate,
          taxRate: Number(dtoItem.taxRate || 0),
          amount: itemAmount,
          totalPrice: itemAmount,
          needsProduction: true,
        });
        currentItems.push(createdLine);
      }
    }

    // Calculate finishing services total from job or payload
    const finishingList = (Array.isArray(estimateData.finishingServices) && estimateData.finishingServices.length > 0)
      ? estimateData.finishingServices
      : (Array.isArray(job.finishingServices) ? job.finishingServices : []);

    const finishingTotal = finishingList.reduce(
      (sum, f) => sum + Number(f.total || (Number(f.unitPrice || 0) * Number(f.quantity || job.quantity || 1))),
      0
    );

    const c = this.calculateTotals(
      currentItems,
      estimateData.discountAmount !== undefined ? estimateData.discountAmount : job.discountAmount
    );

    this.assertDiscountAllowed(c.subtotal, c.discount, user);

    const hasFinishingInItems = currentItems.some(
      (it) => it.itemName?.toLowerCase().includes("finishing") || it.itemType === "FINISHING"
    );

    const finalGrandTotal = Math.max(
      c.grandTotal + (hasFinishingInItems ? 0 : finishingTotal),
      Number(estimateData.total || estimateData.grandTotal || 0)
    );

    job.subtotal = c.subtotal;
    job.taxAmount = c.taxAmount;
    job.discountAmount = c.discount;
    job.grandTotal = finalGrandTotal;
    job.totalAmount = finalGrandTotal;
    job.estimatedPrice = finalGrandTotal;
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

      const estimateRecord = await Estimate.create({
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

    const userRole = String(user.role || user.roleCode || "").toLowerCase();
    const isDesigner = userRole === "designer";

    if (isDesigner) {
      const isOwner = job.source === "DESIGNER" && String(job.createdBy) === String(user._id);
      if (!isOwner) {
        throw ErrorHelper.forbidden("Designers can only approve estimations for Designer Job Orders they created.");
      }
    }

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
    if (approveData.advancePaid !== undefined) {
      approval.advancePaid = Number(approveData.advancePaid || 0);
      approval.advanceType = approveData.advanceType || "AMOUNT";
      approval.advanceValue = Number(approveData.advanceValue || approveData.advancePaid || 0);
      approval.balanceDue = Math.max(0, (pricing.grandTotal || job.grandTotal || 0) - Number(approveData.advancePaid || 0));
    }
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

    const jobTypeStr = String(job.jobType || job.specs?.jobType || "").toUpperCase();
    const isPrintOnly = jobTypeStr.includes("PRINT") && !jobTypeStr.includes("DESIGN");

    const patch = {
      estimationStatus: "APPROVED",
      // Print Only has no production step: it waits at ESTIMATE_APPROVAL for the invoice, like every other type
      currentStage: "ESTIMATE_APPROVAL",
      stage: "ESTIMATE_APPROVAL",
      designStatus: isPrintOnly ? "NOT_REQUIRED" : (isDesigner ? "ASSIGNED" : "UNASSIGNED"),
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
      ...(approveData.advancePaid !== undefined
        ? {
            advancePaid: Number(approveData.advancePaid || 0),
            advanceType: approveData.advanceType || "AMOUNT",
            advanceValue: Number(approveData.advanceValue || approveData.advancePaid || 0),
            balanceDue: Math.max(0, (pricing.grandTotal || job.grandTotal || 0) - Number(approveData.advancePaid || 0)),
          }
        : {}),
      ...(Array.isArray(approveData.items) && approveData.items.length > 0
        ? {
            items: approveData.items.map((it, idx) => ({
              lineNo: idx + 1,
              itemName: it.itemName || it.name || "Print Item",
              description: it.description || it.spec || "",
              quantity: Number(it.quantity || it.qty || 1),
              unit: it.unit || "PCS",
              unitRate: Number(it.unitRate || it.unitPrice || it.rate || 0),
              unitPrice: Number(it.unitPrice || it.unitRate || it.rate || 0),
              amount: Number(it.amount || 0),
            })),
          }
        : {}),
      approvedPricing: pricing,
    };

    // Job stays at ESTIMATE_APPROVAL awaiting invoicing and advance payment before going to designer
    let updated;
    try {
      updated = await JobWorkflowService.touch(job._id, {
        actorId: user._id,
        notes: "Estimate approved. Awaiting invoice generation & advance payment.",
        patch,
        user,
      });
    } catch (touchErr) {
      console.warn("Workflow touch error, applying direct patch:", touchErr.message);
      updated = await jobOrderRepository.update(job._id, patch);
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
