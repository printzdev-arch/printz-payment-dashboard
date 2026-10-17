const mongoose = require("mongoose");
const invoiceRepository = require("../../models/invoice/Invoice");
const JobOrder = require("../../models/job-order/JobOrder");
const { JobItem } = require("../../models/job-order/JobItem");
const Customer = require("../../models/customer/Customer");
const Branch = require("../../models/common/Branch");
const DeliveryOrder = require("../../models/delivery/DeliveryOrder");
const CommonApproval = require("../../models/common/Approval");
const numberSequenceService = require("../common/numberSequence.service");
const auditLogService = require("../common/auditLog.service");
const InvoiceCalculationService = require("./invoiceCalculation.service");
const InvoicePdfService = require("./invoicePdf.service");
const { INVOICE_STATUS, INVOICE_TYPE, VARIANCE_POLICY } = require("../../utils/constants/invoice");
const ErrorHelper = require("../../utils/ApiError");

// Singletons injected above

class InvoiceService {
  /**
   * Helper to verify branch access.
   */
  static assertBranchAccess(branchId, authContext, user) {
    if (!branchId) return;
    const isSuper = Boolean(
      authContext?.isSuperAdmin ||
      authContext?.role === "admin" ||
      authContext?.user?.role === "admin" ||
      authContext?.scopes?.includes("ALL") ||
      user?.role === "admin" ||
      user?.role === "superadmin" ||
      user?.role === "SUPER_ADMIN" ||
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
   * 1. Retrieve invoice-eligible job orders.
   */
  static async getPendingEligibleJobOrders(query = {}, authContext = {}) {
    const filter = {
      status: { $nin: ["CANCELLED"] },
      estimationStatus: "APPROVED",
    };

    if (!authContext.isSuperAdmin && authContext.userBranchIds && authContext.userBranchIds.length > 0) {
      filter.branchId = { $in: authContext.userBranchIds };
    } else if (query.branchId) {
      filter.branchId = query.branchId;
    }

    if (query.customerId) filter.customerId = query.customerId;
    if (query.search) {
      const reg = new RegExp(query.search, "i");
      filter.$or = [{ jobNo: reg }, { "customerSnapshot.name": reg }];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      JobOrder.find(filter)
        .populate("branchId", "name code")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobOrder.countDocuments(filter),
    ]);

    // Check which ones already have finalized or draft invoices
    const jobIds = jobs.map((j) => j._id);
    const existingInvoices = await invoiceRepository.findAll({ jobOrderId: { $in: jobIds } }, { limit: 1000 });
    const invoiceByJobId = new Map();
    for (const inv of existingInvoices.items || []) {
      invoiceByJobId.set(String(inv.jobOrderId), inv);
    }

    const enriched = jobs.map((job) => {
      const existing = invoiceByJobId.get(String(job._id));
      const isAlreadyFinalized = existing && [INVOICE_STATUS.FINALIZED, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID].includes(existing.status);
      const hasDraft = existing && existing.status === INVOICE_STATUS.DRAFT;

      return {
        jobOrderId: job._id,
        jobNo: job.jobNo,
        title: job.title,
        orderDate: job.orderDate,
        branchId: job.branchId,
        customerId: job.customerId,
        customerSnapshot: job.customerSnapshot,
        currentStage: job.currentStage,
        status: job.status,
        estimatedPrice: job.estimatedPrice || job.grandTotal || 0,
        subtotal: job.subtotal || 0,
        taxAmount: job.taxAmount || 0,
        grandTotal: job.grandTotal || 0,
        itemCount: (job.items || []).length,
        eligible: !isAlreadyFinalized,
        ineligibilityReason: isAlreadyFinalized ? "ALREADY_FINALIZED" : null,
        existingInvoice: existing ? { id: existing._id, invoiceNumber: existing.invoiceNumber, status: existing.status } : null,
      };
    });

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 2. Get single job order invoice eligibility details.
   */
  static async getJobOrderEligibility(jobOrderId, authContext = {}) {
    if (!mongoose.Types.ObjectId.isValid(jobOrderId)) {
      throw ErrorHelper.badRequest("Invalid jobOrderId format.");
    }

    const job = await JobOrder.findById(jobOrderId).lean();
    if (!job) throw ErrorHelper.notFound("Job Order not found.");

    this.assertBranchAccess(job.branchId, authContext);

    const reasons = [];
    if (job.status === "CANCELLED") reasons.push("JOB_CANCELLED");
    if (job.estimationStatus !== "APPROVED") reasons.push("ESTIMATE_NOT_APPROVED");

    // Check existing invoice
    const existingInvoice = await invoiceRepository.findActiveByJobOrderId(job._id);
    if (existingInvoice && [INVOICE_STATUS.FINALIZED, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID].includes(existingInvoice.status)) {
      reasons.push("ALREADY_INVOICED");
    }

    const items = await JobItem.find({ jobOrderId: job._id }).lean();
    const resolvedItems = (items.length > 0 ? items : (job.items || [])).map((it) => ({
      jobOrderItemId: it._id,
      itemId: it.itemId || it._id,
      itemName: it.itemName || it.title || "Print Item",
      description: it.description || "",
      quantity: it.quantity || 1,
      unit: it.unit || "pcs",
      unitPrice: it.unitRate || it.unitPrice || 0,
      unitRate: it.unitRate || it.unitPrice || 0,
      taxRate: it.taxRate || 0,
      amount: it.amount || it.totalPrice || 0,
    }));

    return {
      jobOrderId: job._id,
      jobNo: job.jobNo,
      eligible: reasons.length === 0,
      reasons,
      currentStage: job.currentStage,
      status: job.status,
      advancePaid: Number(job.advancePaid || 0),
      estimateSnapshot: {
        estimatedPrice: job.estimatedPrice || job.grandTotal || 0,
        subtotal: job.subtotal || 0,
        discountAmount: job.discountAmount || 0,
        taxAmount: job.taxAmount || 0,
        grandTotal: job.grandTotal || 0,
      },
      customerSnapshot: job.customerSnapshot,
      branchId: job.branchId,
      items: resolvedItems,
      billableItems: resolvedItems,
      existingInvoice: existingInvoice ? {
        id: existingInvoice._id,
        invoiceNumber: existingInvoice.invoiceNumber,
        status: existingInvoice.status,
      } : null,
    };
  }

  /**
   * 3. Create Draft Invoice from eligible Job Order.
   */
  static async createDraft(payload = {}, user, authContext = {}) {
    const { jobOrderId, additionalCharges = [], remarks = "", dueDate = null } = payload;
    if (!jobOrderId) throw ErrorHelper.badRequest("jobOrderId is required.");

    const job = await JobOrder.findById(jobOrderId);
    if (!job) throw ErrorHelper.notFound("Job Order not found.");

    this.assertBranchAccess(job.branchId, authContext, user);

    if (job.status === "CANCELLED") {
      throw ErrorHelper.conflict("Cannot create invoice: Job Order is CANCELLED.");
    }
    if (job.estimationStatus !== "APPROVED") {
      throw ErrorHelper.conflict("Cannot create invoice: Approved estimate is required.");
    }

    // Check if active draft or finalized invoice already exists
    const existingActive = await invoiceRepository.findActiveByJobOrderId(job._id);
    if (existingActive) {
      if (existingActive.status === INVOICE_STATUS.DRAFT) {
        return existingActive; // Reuse existing draft
      }
      throw ErrorHelper.conflict(`Cannot create new invoice: Invoice already exists with status '${existingActive.status}' (${existingActive.invoiceNumber || "DRAFT"}).`);
    }

    const [branch, customer, jobItems, deliveryOrder] = await Promise.all([
      Branch.findById(job.branchId).lean(),
      job.customerId ? Customer.findById(job.customerId).lean() : null,
      JobItem.find({ jobOrderId: job._id }).lean(),
      DeliveryOrder.findOne({ jobOrderId: job._id, status: { $ne: "CANCELLED" } }).lean(),
    ]);

    const customerSnapshot = customer ? {
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      company: customer.company || customer.companyName,
      gstin: customer.gstin,
      address: customer.address,
    } : (job.customerSnapshot || { name: job.customerName, mobile: job.customerPhone });

    const branchSnapshot = branch ? {
      name: branch.name,
      code: branch.code,
      address: branch.address,
    } : {};

    // Map JobItems into billable invoice items
    const sourceItems = jobItems.length > 0 ? jobItems : (job.items || []);
    const draftItems = sourceItems.map((it) => ({
      jobOrderItemId: it._id,
      itemId: it.itemId || null,
      itemCode: it.itemCode || "",
      itemName: it.itemName || it.title || "Print Item",
      description: it.description || "",
      unit: it.unit || "PCS",
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitRate || it.unitPrice) || 0,
      taxRate: Number(it.taxRate) || 0,
      discountType: "FIXED",
      discountValue: 0,
    }));

    const estimateAmount = job.estimatedPrice || job.grandTotal || 0;

    const calc = InvoiceCalculationService.calculateInvoice({
      items: draftItems,
      additionalCharges,
      customerSnapshot,
      branchSnapshot,
      estimateAmount,
      advanceReceived: Number(job.advancePaid) || 0,
      paidAmount: 0,
    });

    const newInvoice = await invoiceRepository.create({
      invoiceType: INVOICE_TYPE.TAX_INVOICE,
      status: INVOICE_STATUS.DRAFT,
      jobOrderId: job._id,
      jobNo: job.jobNo,
      customerId: customer ? customer._id : job.customerId,
      customerSnapshot,
      branchId: job.branchId,
      branchSnapshot,
      estimateId: job._id,
      deliveryOrderId: deliveryOrder ? deliveryOrder._id : null,
      invoiceDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      items: calc.items,
      additionalCharges: calc.additionalCharges,
      subtotal: calc.subtotal,
      discountTotal: calc.discountTotal,
      additionalChargesTotal: calc.additionalChargesTotal,
      taxableAmount: calc.taxableAmount,
      cgstTotal: calc.cgstTotal,
      sgstTotal: calc.sgstTotal,
      igstTotal: calc.igstTotal,
      taxTotal: calc.taxTotal,
      grandTotal: calc.grandTotal,
      advanceApplied: calc.advanceApplied,
      paidAmount: calc.paidAmount,
      balanceDue: calc.balanceDue,
      estimateAmountSnapshot: calc.estimateAmountSnapshot,
      varianceAmount: calc.varianceAmount,
      variancePercentage: calc.variancePercentage,
      approvalRequired: calc.approvalRequired,
      remarks,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    });

    await auditLogService.log({
      action: "INVOICE_DRAFT_CREATE",
      resource: "Invoice", resourceId: newInvoice._id, userId: user?._id, userName: user?.username || "System",
      branchId: job.branchId,
      details: {
        invoiceId: newInvoice._id,
        jobOrderId: job._id,
        jobNo: job.jobNo,
        grandTotal: calc.grandTotal,
        approvalRequired: calc.approvalRequired,
      },
    });

    return newInvoice;
  }

  /**
   * 4. Update allowed Draft Invoice fields.
   */
  static async updateDraft(id, updatePayload = {}, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    if (invoice.status !== INVOICE_STATUS.DRAFT) {
      throw ErrorHelper.conflict(`Cannot edit invoice in '${invoice.status}' status. Only DRAFT invoices can be updated.`);
    }

    const items = updatePayload.items !== undefined ? updatePayload.items : invoice.items;
    const additionalCharges = updatePayload.additionalCharges !== undefined ? updatePayload.additionalCharges : invoice.additionalCharges;

    const calc = InvoiceCalculationService.calculateInvoice({
      items,
      additionalCharges,
      customerSnapshot: invoice.customerSnapshot,
      branchSnapshot: invoice.branchSnapshot,
      estimateAmount: invoice.estimateAmountSnapshot,
      advanceReceived: updatePayload.advanceApplied !== undefined ? updatePayload.advanceApplied : invoice.advanceApplied,
      paidAmount: invoice.paidAmount,
    });

    const updateData = {
      items: calc.items,
      additionalCharges: calc.additionalCharges,
      subtotal: calc.subtotal,
      discountTotal: calc.discountTotal,
      additionalChargesTotal: calc.additionalChargesTotal,
      taxableAmount: calc.taxableAmount,
      cgstTotal: calc.cgstTotal,
      sgstTotal: calc.sgstTotal,
      igstTotal: calc.igstTotal,
      taxTotal: calc.taxTotal,
      grandTotal: calc.grandTotal,
      advanceApplied: calc.advanceApplied,
      balanceDue: calc.balanceDue,
      varianceAmount: calc.varianceAmount,
      variancePercentage: calc.variancePercentage,
      approvalRequired: calc.approvalRequired,
      remarks: updatePayload.remarks !== undefined ? updatePayload.remarks : invoice.remarks,
      dueDate: updatePayload.dueDate !== undefined ? new Date(updatePayload.dueDate) : invoice.dueDate,
      updatedBy: user?._id || null,
    };

    const updated = await invoiceRepository.updateById(invoice._id, updateData);

    await auditLogService.log({
      action: "INVOICE_DRAFT_UPDATE",
      resource: "Invoice", resourceId: invoice._id, userId: user?._id, userName: user?.username || "System",
      branchId: invoice.branchId,
      details: {
        grandTotal: calc.grandTotal,
        varianceAmount: calc.varianceAmount,
        approvalRequired: calc.approvalRequired,
      },
    });

    return updated;
  }

  /**
   * 5. Calculate invoice totals and preview variance without persisting.
   */
  static async calculate(id, calculatePayload = {}, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    const items = calculatePayload.items || invoice.items;
    const additionalCharges = calculatePayload.additionalCharges || invoice.additionalCharges;

    return InvoiceCalculationService.calculateInvoice({
      items,
      additionalCharges,
      customerSnapshot: invoice.customerSnapshot,
      branchSnapshot: invoice.branchSnapshot,
      estimateAmount: invoice.estimateAmountSnapshot,
      advanceReceived: calculatePayload.advanceApplied !== undefined ? calculatePayload.advanceApplied : invoice.advanceApplied,
      paidAmount: invoice.paidAmount,
    });
  }

  /**
   * 6. Submit invoice for approval when variance exceeds tolerance.
   */
  static async submitForApproval(id, submitPayload = {}, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    if (invoice.status !== INVOICE_STATUS.DRAFT) {
      throw ErrorHelper.conflict(`Invoice is already in '${invoice.status}' status.`);
    }

    if (!invoice.approvalRequired) {
      // Direct pass without approval needed
      invoice.status = INVOICE_STATUS.APPROVED;
      invoice.approvedBy = user?._id || null;
      invoice.approvedAt = new Date();
      invoice.approvalRemarks = "Directly approved: Within allowed variance tolerance.";
      await invoice.save();

      await auditLogService.log({
        action: "INVOICE_DIRECT_APPROVE",
        resource: "Invoice", resourceId: invoice._id, userId: user?._id, userName: user?.username || "System",
        branchId: invoice.branchId,
        details: { variancePercentage: invoice.variancePercentage },
      });

      return invoice;
    }

    // Variance exceeds tolerance -> Create common approval
    const approvalCount = await CommonApproval.countDocuments({ referenceType: "INVOICE_VARIANCE" });
    const approvalNo = `APR-INV-${Date.now().toString().slice(-6)}-${approvalCount + 1}`;

    const approval = await CommonApproval.create({
      approvalNo,
      referenceType: "INVOICE_VARIANCE",
      referenceId: invoice._id,
      requestedBy: user?._id || invoice.createdBy,
      branchId: invoice.branchId,
      status: "PENDING",
      comments: submitPayload.comments || `Variance of ${invoice.variancePercentage}% exceeds threshold.`,
    });

    invoice.status = INVOICE_STATUS.PENDING_APPROVAL;
    invoice.approvalId = approval._id;
    await invoice.save();

    await auditLogService.log({
      action: "INVOICE_SUBMIT_APPROVAL",
      resource: "Invoice", resourceId: invoice._id, userId: user?._id, userName: user?.username || "System",
      branchId: invoice.branchId,
      details: {
        approvalId: approval._id,
        approvalNo,
        varianceAmount: invoice.varianceAmount,
        variancePercentage: invoice.variancePercentage,
      },
    });

    return invoice;
  }

  /**
   * 7. Approve or reject variance decision.
   */
  static async approveVariance(id, decisionPayload = {}, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    if (invoice.status !== INVOICE_STATUS.PENDING_APPROVAL) {
      throw ErrorHelper.conflict(`Invoice is not pending approval. Current status: '${invoice.status}'.`);
    }

    const { decision = "APPROVED", remarks = "" } = decisionPayload;
    const isApproved = decision.toUpperCase() === "APPROVED";

    if (invoice.approvalId) {
      await CommonApproval.findByIdAndUpdate(invoice.approvalId, {
        status: isApproved ? "APPROVED" : "REJECTED",
        approverId: user?._id,
        decidedAt: new Date(),
        comments: remarks || (isApproved ? "Variance approved" : "Variance rejected"),
      });
    }

    invoice.status = isApproved ? INVOICE_STATUS.APPROVED : INVOICE_STATUS.DRAFT;
    invoice.approvedBy = isApproved ? user?._id : null;
    invoice.approvedAt = isApproved ? new Date() : null;
    invoice.approvalRemarks = remarks || (isApproved ? "Approved by authorized approver." : "Rejected by approver.");
    await invoice.save();

    await auditLogService.log({
      action: isApproved ? "INVOICE_VARIANCE_APPROVE" : "INVOICE_VARIANCE_REJECT",
      resource: "Invoice", resourceId: invoice._id, userId: user?._id, userName: user?.username || "System",
      branchId: invoice.branchId,
      details: { decision, remarks },
    });

    return invoice;
  }

  /**
   * 8. Finalize Invoice atomically.
   */
  static async finalize(id, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    if ([INVOICE_STATUS.FINALIZED, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID].includes(invoice.status)) {
      throw ErrorHelper.conflict(`Invoice is already finalized with number: ${invoice.invoiceNumber}`);
    }

    if (invoice.status === INVOICE_STATUS.PENDING_APPROVAL) {
      throw ErrorHelper.conflict("Cannot finalize invoice: Pending variance approval must be approved first.");
    }

    // Re-verify Job Order
    const job = await JobOrder.findById(invoice.jobOrderId);
    if (!job || job.status === "CANCELLED") {
      throw ErrorHelper.conflict("Cannot finalize invoice: Job Order is invalid or cancelled.");
    }

    // Concurrency-safe atomic number generation using numberSequenceService
    const invoiceNumber = await numberSequenceService.getNextSequence("INV", invoice.branchId);

    invoice.invoiceNumber = invoiceNumber;
    invoice.status = INVOICE_STATUS.FINALIZED;
    invoice.finalizedBy = user?._id || null;
    invoice.finalizedAt = new Date();
    await invoice.save();

    // Link invoice number back to JobOrder and transition stage to INVOICED
    job.invoiceNo = invoiceNumber;
    job.invoiceId = invoice._id;
    job.currentStage = "INVOICED";
    job.stage = "INVOICED";
    await job.save();

    await auditLogService.log({
      action: "INVOICE_FINALIZE",
      resource: "Invoice", resourceId: invoice._id, userId: user?._id, userName: user?.username || "System",
      branchId: invoice.branchId,
      details: {
        invoiceNumber,
        grandTotal: invoice.grandTotal,
        balanceDue: invoice.balanceDue,
      },
    });

    return invoice;
  }

  /**
   * 9. Generate Printable Invoice HTML.
   */
  static async getPdf(id, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    const html = InvoicePdfService.renderPrintHtml(invoice);
    return {
      invoiceNumber: invoice.invoiceNumber || "DRAFT",
      status: invoice.status,
      html,
    };
  }

  /**
   * 10. Share Invoice.
   */
  static async share(id, sharePayload = {}, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    const channel = (sharePayload.channel || "EMAIL").toUpperCase();
    const recipient = sharePayload.recipient || invoice.customerSnapshot.email || invoice.customerSnapshot.mobile;

    if (!recipient) {
      throw ErrorHelper.badRequest("Recipient (email or mobile) is required to share invoice.");
    }

    // Write audit record for sharing event
    await auditLogService.log({
      action: "INVOICE_SHARE",
      resource: "Invoice", resourceId: invoice._id, userId: user?._id, userName: user?.username || "System",
      branchId: invoice.branchId,
      details: {
        channel,
        recipient,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    return {
      success: true,
      channel,
      recipient,
      message: `Invoice ${invoice.invoiceNumber || "DRAFT"} dispatched via ${channel} to ${recipient}.`,
    };
  }

  /**
   * 11. Retrieve audit history for an invoice.
   */
  static async getAuditLogs(id, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog");
    return AuditLog.find({ entityId: invoice._id }).sort({ createdAt: -1 }).lean();
  }
}

module.exports = InvoiceService;
