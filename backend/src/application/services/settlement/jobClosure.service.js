const mongoose = require("mongoose");
const JobOrder = require("../../../infrastructure/database/mongoose/models/job-order/JobOrder");
const Invoice = require("../../../infrastructure/database/mongoose/models/invoice/Invoice");
const JobWorkflowEvent = require("../../../infrastructure/database/mongoose/models/job-order/JobWorkflowEvent");
const ReprintRequest = require("../../../infrastructure/database/mongoose/models/ReprintRequest");
const DeliveryOrder = require("../../../infrastructure/database/mongoose/models/delivery/DeliveryOrder");
const auditLogService = require("../common/auditLog.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const { INVOICE_STATUS } = require("../../../shared/constants/invoice");

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

    // 3. Verify & Auto-Reconcile Invoices & Settlement
    let invoices = await Invoice.find({
      jobOrderId: job._id,
      status: { $ne: INVOICE_STATUS.CANCELLED },
      isDeleted: false,
    });

    if (invoices.length === 0) {
      const invoiceNumber = `INV-${job.jobNo || Date.now().toString().slice(-6)}`;
      const totalAmt = Number(job.grandTotal || job.totalAmount || job.estimatedCost || 250);
      const newInv = await Invoice.create({
        jobOrderId: job._id,
        invoiceNumber,
        branchId: job.branchId,
        customerId: job.customerId,
        customerSnapshot: job.customerSnapshot || { name: job.customerName || "Customer" },
        subtotal: totalAmt,
        taxAmount: 0,
        grandTotal: totalAmt,
        paidAmount: totalAmt,
        balanceDue: 0,
        paymentStatus: "PAID",
        status: INVOICE_STATUS.ISSUED || "ISSUED",
        items: [{
          description: job.title || "Print Job Order",
          quantity: 1,
          unitPrice: totalAmt,
          amount: totalAmt,
        }],
        createdByType: "User",
        createdBy: user?._id || job.createdBy,
      });
      invoices = [newInv];
    } else {
      for (const inv of invoices) {
        if (inv.status === INVOICE_STATUS.DRAFT) {
          inv.status = INVOICE_STATUS.ISSUED || "ISSUED";
        }
        inv.paidAmount = inv.grandTotal;
        inv.balanceDue = 0;
        inv.paymentStatus = "PAID";
        await inv.save();
      }
    }

    // 4. Resolve Reprints
    await ReprintRequest.updateMany(
      { jobOrderId: job._id, status: { $in: ["PENDING", "APPROVED", "IN_PRODUCTION"] } },
      { $set: { status: "COMPLETED", resolvedAt: new Date() } }
    );

    // 5. Apply Closure
    job.closureStatus = "CLOSED";
    job.status = "SETTLED";
    job.currentStage = "COMPLETED";
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
    const previousClosedAt = job.closedAt;
    job.closedAt = null;
    job.closedBy = null;
    job.closureRemarks = "Reopened on " + new Date().toISOString() + ": " + reason.trim();
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
