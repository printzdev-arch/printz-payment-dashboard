const mongoose = require("mongoose");
const JobOrder = require("../../models/job-order/JobOrder");
const Invoice = require("../../models/invoice/Invoice");
const JobWorkflowEvent = require("../../models/job-order/JobWorkflowEvent");
const ReprintRequest = require("../../models/production/ReprintRequest");
const paymentRepository = require("../../models/invoice/Payment");
const auditLogService = require("../common/auditLog.service");
const ErrorHelper = require("../../utils/ApiError");
const { INVOICE_STATUS } = require("../../utils/constants/invoice");
const { formatISTDateTime } = require("../../utils/dateUtils");

class JobClosureService {
  static assertBranchAccess(branchId, authContext, user) {
    if (!branchId) return;
    const isSuper = Boolean(
      authContext?.isSuperAdmin ||
      user?.role === "admin" ||
      user?.role === "superadmin" ||
      user?.roleCode === "ADMIN" ||
      user?.roleCode === "SUPER_ADMIN"
    );
    if (isSuper) return;

    const branchStr = branchId ? branchId.toString() : "";
    const allowed = [
      ...(authContext?.userBranchIds || []),
      user?.branchId ? (user.branchId._id ? user.branchId._id.toString() : user.branchId.toString()) : null,
      ...(user?.branchIds || []).map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
    ].filter(Boolean).map((b) => b.toString());

    if (branchStr && allowed.length > 0 && !allowed.includes(branchStr)) {
      throw ErrorHelper.forbidden("Branch access denied: You are not authorized for this branch.");
    }
  }

  /**
   * Final administrative closure after validating all business prerequisites.
   */
  static async closeJob(jobId, { remarks = "" } = {}, user = null, authContext = {}) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await JobOrder.findById(jobId);
    if (!job) {
      throw ErrorHelper.notFound("Job Order not found with ID: " + jobId);
    }

    this.assertBranchAccess(job.branchId, authContext, user);

    // 1. Check if already closed
    if (job.closureStatus === "CLOSED") {
      return { message: "Job Order " + job.jobNo + " is already closed.", job };
    }

    // 2. Delivery Fulfillment
    const isJobDelivered =
      job.status === "DELIVERED" ||
      job.status === "COMPLETED" ||
      job.status === "SETTLED" ||
      job.currentStage === "COMPLETED";

    if (!isJobDelivered) {
      job.status = "DELIVERED";
      job.currentStage = "DELIVERY";
    }

    // 3. Verify & Reconcile Invoices & Settlement
    const invoices = await Invoice.find({
      jobOrderId: job._id,
      status: { $ne: INVOICE_STATUS.CANCELLED },
      isDeleted: false,
    });

    let totalOutstanding = 0;
    if (invoices.length > 0) {
      for (const inv of invoices) {
        if (inv.status === INVOICE_STATUS.DRAFT) {
          inv.status = INVOICE_STATUS.FINALIZED;
        }
        const validPayments = await paymentRepository.findValidPaymentsByInvoiceId(inv._id);
        const amountPaid = Math.round((validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) + Number.EPSILON) * 100) / 100;
        const invoiceTotal = Math.round((Number(inv.grandTotal || 0) + Number.EPSILON) * 100) / 100;
        const applicableAdvance = Math.round((Number(inv.advanceApplied || inv.advancePaid || 0) + Number.EPSILON) * 100) / 100;
        const balanceDue = Math.max(0, Math.round((invoiceTotal - amountPaid - applicableAdvance + Number.EPSILON) * 100) / 100);

        inv.paidAmount = amountPaid;
        inv.balanceDue = balanceDue;
        if (amountPaid + applicableAdvance >= invoiceTotal && invoiceTotal > 0) {
          inv.paymentStatus = "PAID";
          inv.status = INVOICE_STATUS.PAID;
        } else if (amountPaid + applicableAdvance > 0) {
          inv.paymentStatus = "PARTIAL";
          inv.status = INVOICE_STATUS.PARTIALLY_PAID;
        } else {
          inv.paymentStatus = "UNPAID";
        }
        await inv.save();
        totalOutstanding += balanceDue;
      }
    }

    job.outstandingBalance = Math.round((totalOutstanding + Number.EPSILON) * 100) / 100;
    if (invoices.length > 0) {
      job.paymentStatus = totalOutstanding <= 0 ? "PAID" : "PARTIAL";
    }

    // 4. Resolve Reprints
    await ReprintRequest.updateMany(
      { jobOrderId: job._id, status: { $in: ["PENDING", "APPROVED", "IN_PRODUCTION"] } },
      { $set: { status: "COMPLETED", resolvedAt: new Date() } }
    );

    // 5. Apply Closure
    job.closureStatus = "CLOSED";
    job.status = "CLOSED";
    job.currentStage = "CLOSED";
    job.stage = "CLOSED";
    job.isLocked = true;
    job.closedAt = new Date();
    job.closedBy = user._id || user.id;
    job.closureRemarks = remarks || "Job administratively closed and locked after full delivery and payment settlement.";
    await job.save();

    // 6. Record Workflow Event
    await JobWorkflowEvent.create({
      jobOrderId: job._id,
      eventType: "job.closed",
      stage: job.currentStage || "COMPLETED",
      fromStatus: job.status,
      toStatus: "CLOSED",
      performedBy: user._id || user.id,
      notes: job.closureRemarks,
      details: {
        closedAt: job.closedAt,
        closedBy: user._id || user.id,
      },
    });

    // 7. Common Audit Log
    await auditLogService.log({
      action: "JOB_CLOSE",
      resource: "JobOrder",
      resourceId: job._id,
      userId: user._id || user.id,
      userName: user.name || user.username || "System",
      branchId: job.branchId,
      details: {
        jobNo: job.jobNo,
        closureStatus: "CLOSED",
        closedAt: job.closedAt,
        remarks: job.closureRemarks,
      },
    });

    return {
      id: job._id,
      jobNo: job.jobNo,
      closureStatus: job.closureStatus,
      closedAt: job.closedAt,
      closedBy: job.closedBy,
      closureRemarks: job.closureRemarks,
      status: job.status,
      stage: job.currentStage,
    };
  }

  /**
   * Retrieve closure state and prerequisite summary.
   */
  static async getClosureDetails(jobId, user = null, authContext = {}) {
    const job = await JobOrder.findById(jobId)
      .populate({ path: "closedBy", select: "name email employeeCode", strictPopulate: false })
      .populate({ path: "branchId", select: "name code", strictPopulate: false })
      .lean();

    if (!job) {
      throw ErrorHelper.notFound("Job Order not found with ID: " + jobId);
    }

    this.assertBranchAccess(job.branchId?._id || job.branchId, authContext, user);

    const invoices = await Invoice.find({
      jobOrderId: job._id,
      status: { $ne: INVOICE_STATUS.CANCELLED },
      isDeleted: false,
    }).lean();

    const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
    const totalBalance = Math.max(0, invoices.reduce((s, i) => s + (Number(i.balanceDue) || 0), 0));
    const isDeliveryComplete = job.status === "DELIVERED" || job.currentStage === "COMPLETED";
    const isInvoicesSettled = invoices.length > 0 && totalBalance <= 0;

    return {
      jobOrderId: job._id,
      jobNo: job.jobNo,
      branchId: job.branchId?._id || job.branchId,
      branchName: job.branchId?.name,
      closureStatus: job.closureStatus || "OPEN",
      closedAt: job.closedAt || null,
      closedBy: job.closedBy || null,
      closureRemarks: job.closureRemarks || null,
      prerequisites: {
        productionComplete: true,
        deliveryComplete: isDeliveryComplete,
        invoicesCount: invoices.length,
        invoicesSettled: isInvoicesSettled,
        totalInvoiced,
        totalPaid,
        outstandingBalance: totalBalance,
        canClose: isDeliveryComplete && isInvoicesSettled && job.closureStatus !== "CLOSED",
      },
    };
  }

  /**
   * Reopen a closed job under authorized administrative review.
   */
  static async reopenJob(jobId, { reason }, user = null, authContext = {}) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    if (!reason || !reason.trim()) {
      throw ErrorHelper.badRequest("Reopening reason is required.");
    }

    const job = await JobOrder.findById(jobId);
    if (!job) {
      throw ErrorHelper.notFound("Job Order not found with ID: " + jobId);
    }

    this.assertBranchAccess(job.branchId, authContext, user);

    if (job.closureStatus !== "CLOSED") {
      throw ErrorHelper.badRequest("Job Order " + job.jobNo + " is not closed (Current closure status: " + (job.closureStatus || "OPEN") + ").");
    }

    job.closureStatus = "OPEN";
    job.isLocked = false;
    const previousClosedAt = job.closedAt;
    job.closedAt = null;
    job.closedBy = null;
    job.closureRemarks = "Reopened on " + formatISTDateTime(new Date()) + ": " + reason.trim();
    await job.save();

    await JobWorkflowEvent.create({
      jobOrderId: job._id,
      eventType: "job.reopened",
      stage: job.currentStage || "COMPLETED",
      fromStatus: "CLOSED",
      toStatus: job.status,
      performedBy: user._id || user.id,
      notes: reason.trim(),
      details: {
        previousClosedAt,
        reopenedAt: new Date(),
        reason: reason.trim(),
      },
    });

    await auditLogService.log({
      action: "JOB_REOPEN",
      resource: "JobOrder",
      resourceId: job._id,
      userId: user._id || user.id,
      userName: user.name || user.username || "System",
      branchId: job.branchId,
      details: {
        jobNo: job.jobNo,
        closureStatus: "OPEN",
        reason: reason.trim(),
      },
    });

    return {
      id: job._id,
      jobNo: job.jobNo,
      closureStatus: job.closureStatus,
      status: job.status,
      remarks: job.closureRemarks,
    };
  }
}

module.exports = JobClosureService;
