const mongoose = require("mongoose");
const Payment = require("../../models/invoice/Payment");
const Invoice = require("../../models/invoice/Invoice");
const JobOrder = require("../../models/job-order/JobOrder");
const paymentRepository = require("../../models/invoice/Payment");
const numberSequenceService = require("../common/numberSequence.service");
const auditLogService = require("../common/auditLog.service");
const ErrorHelper = require("../../utils/ApiError");
const { INVOICE_STATUS } = require("../../utils/constants/invoice");

class SettlementService {
  /**
   * Helper to verify branch access.
   */
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

  static round2(val) {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Retrieve settlement details for an existing invoice.
   */
  static async getSettlement(invoiceId, authContext = {}, user = null) {
    const invoice = await Invoice.findById(invoiceId)
      .populate("jobOrderId", "jobNo title stage status")
      .populate("branchId", "name code")
      .populate("customerId", "name mobile email")
      .lean();

    if (!invoice || invoice.isDeleted) {
      throw ErrorHelper.notFound("Invoice not found with ID: " + invoiceId);
    }

    this.assertBranchAccess(invoice.branchId?._id || invoice.branchId, authContext, user);

    const validPayments = await paymentRepository.findValidPaymentsByInvoiceId(invoice._id);
    const amountPaid = this.round2(
      validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    );
    const invoiceTotal = this.round2(invoice.grandTotal || 0);
    const applicableAdvance = this.round2(invoice.advanceApplied || invoice.advancePaid || 0);
    const balanceDue = Math.max(0, this.round2(invoiceTotal - amountPaid - applicableAdvance));

    let paymentStatus = "UNPAID";
    if (amountPaid + applicableAdvance >= invoiceTotal && invoiceTotal > 0) {
      paymentStatus = "PAID";
    } else if (amountPaid + applicableAdvance > 0) {
      paymentStatus = "PARTIAL";
    }

    return {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      jobOrderId: invoice.jobOrderId?._id || invoice.jobOrderId,
      jobNo: invoice.jobNo || invoice.jobOrderId?.jobNo,
      branchId: invoice.branchId?._id || invoice.branchId,
      branchName: invoice.branchId?.name || invoice.branchSnapshot?.name,
      customerId: invoice.customerId?._id || invoice.customerId,
      customerName: invoice.customerId?.name || invoice.customerSnapshot?.name,
      invoiceTotal,
      amountPaid,
      balanceDue,
      paymentStatus,
      status: invoice.status,
      payments: validPayments.map((p) => ({
        id: p._id,
        paymentNo: p.paymentNo,
        amount: p.amount,
        paymentMode: p.paymentMode,
        paymentReference: p.paymentReference,
        paymentDate: p.paymentDate,
        status: p.status,
        remarks: p.remarks,
      })),
    };
  }

  /**
   * Record a payment against an existing invoice.
   */
  static async collectPayment(invoiceId, paymentData = {}, user = null, authContext = {}) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.isDeleted) {
      throw ErrorHelper.notFound("Invoice not found with ID: " + invoiceId);
    }

    this.assertBranchAccess(invoice.branchId, authContext, user);

    if (invoice.status === INVOICE_STATUS.CANCELLED) {
      throw ErrorHelper.badRequest("Cannot collect payment on a CANCELLED invoice.");
    }
    if (invoice.status === INVOICE_STATUS.DRAFT) {
      throw ErrorHelper.badRequest("Cannot collect payment on a DRAFT invoice. Invoice must be submitted/finalized first.");
    }

    const amount = Number(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      throw ErrorHelper.badRequest("Payment amount must be a positive number greater than zero.");
    }

    const validModes = ["CASH", "CARD", "UPI", "BANK", "ONLINE", "CHEQUE", "CREDIT"];
    const mode = String(paymentData.paymentMode || paymentData.paymentMethod || "CASH").toUpperCase();
    if (!validModes.includes(mode)) {
      throw ErrorHelper.badRequest("Invalid paymentMode: " + mode + ". Allowed modes: " + validModes.join(", "));
    }

    // Check Idempotency Key
    if (paymentData.idempotencyKey) {
      const existingPayment = await Payment.findOne({
        invoiceId: invoice._id,
        idempotencyKey: paymentData.idempotencyKey,
      }).populate("collectedBy", "name email");
      if (existingPayment) {
        const settlement = await this.getSettlement(invoice._id, authContext, user);
        return { payment: existingPayment, settlement };
      }
    }

    // Calculate authoritative current balance
    const validPayments = await paymentRepository.findValidPaymentsByInvoiceId(invoice._id);
    const currentPaid = this.round2(
      validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    );
    const invoiceTotal = this.round2(invoice.grandTotal || 0);
    const applicableAdvance = this.round2(invoice.advanceApplied || invoice.advancePaid || 0);
    const currentBalanceDue = Math.max(0, this.round2(invoiceTotal - currentPaid - applicableAdvance));

    if (currentBalanceDue <= 0) {
      throw ErrorHelper.badRequest("Invoice is already fully PAID. Outstanding balance is 0.00.");
    }

    // Overpayment check (tolerance 0.001)
    if (amount > currentBalanceDue + 0.001) {
      throw ErrorHelper.badRequest(
        "Overpayment not allowed: Payment amount (" + amount + ") exceeds remaining balance due (" + currentBalanceDue.toFixed(2) + ")."
      );
    }

    // Generate Payment Number
    let paymentNo;
    try {
      paymentNo = await numberSequenceService.getNextSequence(
        "PAY",
        invoice.branchId,
        "PAY-YYYY-XXXX"
      );
    } catch (_) {
      paymentNo = "PAY-" + Date.now().toString().slice(-8);
    }

    // Create Payment
    const payment = await Payment.create({
      paymentNo,
      invoiceId: invoice._id,
      jobOrderId: invoice.jobOrderId,
      customerId: invoice.customerId,
      branchId: invoice.branchId,
      amount: this.round2(amount),
      paymentMode: ["CASH", "CARD", "UPI", "BANK"].includes(mode) ? mode : "CASH",
      paymentMethod: mode,
      paymentReference: paymentData.paymentReference || paymentData.referenceNumber || null,
      referenceNumber: paymentData.referenceNumber || paymentData.paymentReference || null,
      paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
      status: "COMPLETED",
      collectedBy: user._id || user.id,
      remarks: paymentData.remarks || paymentData.notes || "",
      idempotencyKey: paymentData.idempotencyKey || null,
    });

    // Update Invoice authoritative settlement fields
    const newPaidTotal = this.round2(currentPaid + amount);
    const newBalanceDue = Math.max(0, this.round2(invoiceTotal - newPaidTotal - applicableAdvance));
    const newPaymentStatus = (newPaidTotal + applicableAdvance) >= invoiceTotal ? "PAID" : "PARTIAL";

    invoice.paidAmount = newPaidTotal;
    invoice.balanceDue = newBalanceDue;
    invoice.paymentStatus = newPaymentStatus;
    if (newPaymentStatus === "PAID") {
      invoice.status = INVOICE_STATUS.PAID;
    } else {
      invoice.status = INVOICE_STATUS.PARTIALLY_PAID;
    }
    await invoice.save();

    // Update Job Order payment status
    await JobOrder.findByIdAndUpdate(invoice.jobOrderId, {
      paymentStatus: newPaymentStatus,
    });

    // Audit log
    await auditLogService.log({
      action: "PAYMENT_COLLECT",
      resource: "Payment",
      resourceId: payment._id,
      userId: user._id || user.id,
      userName: user.name || user.username || "System",
      branchId: invoice.branchId,
      details: {
        paymentNo,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount,
        paymentMode: mode,
        balanceDue: newBalanceDue,
        paymentStatus: newPaymentStatus,
      },
    });

    const settlement = await this.getSettlement(invoice._id, authContext, user);

    return {
      payment,
      settlement,
    };
  }

  /**
   * Paginated payment history for an invoice.
   */
  static async getPaymentsByInvoice(invoiceId, query = {}, user = null, authContext = {}) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.isDeleted) {
      throw ErrorHelper.notFound("Invoice not found with ID: " + invoiceId);
    }
    this.assertBranchAccess(invoice.branchId, authContext, user);

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { invoiceId: invoice._id };
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .populate("collectedBy", "name email employeeCode")
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieve single payment details by ID.
   */
  static async getPaymentById(paymentId, user = null, authContext = {}) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw ErrorHelper.notFound("Payment record not found with ID: " + paymentId);
    }
    this.assertBranchAccess(payment.branchId?._id || payment.branchId, authContext, user);
    return payment;
  }

  /**
   * Generate receipt for a payment.
   */
  static async generateReceipt(paymentId, user = null, authContext = {}) {
    const payment = await Payment.findById(paymentId)
      .populate("invoiceId")
      .populate("jobOrderId")
      .populate("branchId")
      .populate("customerId")
      .populate("collectedBy", "name email");

    if (!payment) {
      throw ErrorHelper.notFound("Payment not found with ID: " + paymentId);
    }
    this.assertBranchAccess(payment.branchId?._id || payment.branchId, authContext, user);

    const inv = payment.invoiceId || {};
    const branch = payment.branchId || {};
    const cust = payment.customerId || inv.customerSnapshot || {};

    const receiptHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Receipt - ' + payment.paymentNo + '</title><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; }.receipt-box { max-width: 650px; margin: auto; padding: 25px; border: 1px solid #cbd5e1; border-radius: 8px; }.header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 15px; margin-bottom: 20px; }.header h2 { margin: 0 0 5px; color: #0f172a; }.row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }.label { color: #64748b; font-weight: 500; }.value { font-weight: 600; }.amount-box { background: #f1f5f9; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0; }.amount-box h3 { margin: 0; font-size: 24px; color: #059669; }.footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; }</style></head><body><div class="receipt-box"><div class="header"><h2>' + (branch.name || "PRINTZ PAYMENT DASHBOARD") + '</h2><p style="margin: 0; font-size: 13px; color: #64748b;">Official Payment Receipt</p></div><div class="row"><span class="label">Receipt / Payment No:</span><span class="value">' + payment.paymentNo + '</span></div><div class="row"><span class="label">Payment Date:</span><span class="value">' + new Date(payment.paymentDate).toLocaleString("en-IN") + '</span></div><div class="row"><span class="label">Invoice Number:</span><span class="value">' + (inv.invoiceNumber || "N/A") + '</span></div><div class="row"><span class="label">Job Order:</span><span class="value">' + (inv.jobNo || "N/A") + '</span></div><div class="row"><span class="label">Customer:</span><span class="value">' + (cust.name || "Walk-in Customer") + '</span></div><div class="row"><span class="label">Payment Mode:</span><span class="value">' + payment.paymentMode + '</span></div>' + (payment.paymentReference ? '<div class="row"><span class="label">Reference / UTR:</span><span class="value">' + payment.paymentReference + '</span></div>' : '') + '<div class="amount-box"><div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">AMOUNT RECEIVED</div><h3>₹' + Number(payment.amount).toFixed(2) + '</h3></div><div class="row"><span class="label">Collected By:</span><span class="value">' + (payment.collectedBy?.name || "Cashier") + '</span></div><div class="row"><span class="label">Status:</span><span class="value" style="color: ' + (payment.status === "COMPLETED" ? "#059669" : "#dc2626") + ';">' + payment.status + '</span></div><div class="footer"><p>Thank you for your business. This is an electronically generated receipt.</p></div></div></body></html>';

    return {
      paymentId: payment._id,
      paymentNo: payment.paymentNo,
      receiptNo: payment.paymentNo,
      invoiceNumber: inv.invoiceNumber,
      amount: payment.amount,
      status: payment.status,
      receiptHtml,
    };
  }

  /**
   * Void a payment and recalculate settlement.
   */
  static async voidPayment(paymentId, { reason }, user = null, authContext = {}) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    if (!reason || !reason.trim()) {
      throw ErrorHelper.badRequest("Void reason is required.");
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw ErrorHelper.notFound("Payment record not found with ID: " + paymentId);
    }

    this.assertBranchAccess(payment.branchId, authContext, user);

    if (payment.status === "VOID") {
      throw ErrorHelper.conflict("Payment is already VOID.");
    }

    payment.status = "VOID";
    payment.voidReason = reason.trim();
    payment.voidedBy = user._id || user.id;
    payment.voidedAt = new Date();
    await payment.save();

    // Recalculate invoice settlement from remaining valid payments
    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      const validPayments = await paymentRepository.findValidPaymentsByInvoiceId(invoice._id);
      const newPaidTotal = this.round2(
        validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      );
      const invoiceTotal = this.round2(invoice.grandTotal || 0);
      const newBalanceDue = Math.max(0, this.round2(invoiceTotal - newPaidTotal));

      let newPaymentStatus = "UNPAID";
      if (newPaidTotal >= invoiceTotal && invoiceTotal > 0) {
        newPaymentStatus = "PAID";
      } else if (newPaidTotal > 0) {
        newPaymentStatus = "PARTIAL";
      }

      invoice.paidAmount = newPaidTotal;
      invoice.balanceDue = newBalanceDue;
      invoice.paymentStatus = newPaymentStatus;
      if (newPaymentStatus === "PAID") {
        invoice.status = INVOICE_STATUS.PAID;
      } else if (newPaymentStatus === "PARTIAL") {
        invoice.status = INVOICE_STATUS.PARTIALLY_PAID;
      } else {
        invoice.status = INVOICE_STATUS.FINALIZED;
      }
      await invoice.save();

      await JobOrder.findByIdAndUpdate(invoice.jobOrderId, {
        paymentStatus: newPaymentStatus,
      });
    }

    // Audit log
    await auditLogService.log({
      action: "PAYMENT_VOID",
      resource: "Payment",
      resourceId: payment._id,
      userId: user._id || user.id,
      userName: user.name || user.username || "System",
      branchId: payment.branchId,
      details: {
        paymentNo: payment.paymentNo,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        reason: reason.trim(),
      },
    });

    const settlement = await this.getSettlement(payment.invoiceId, authContext, user);
    return {
      payment,
      settlement,
    };
  }
}

module.exports = SettlementService;
