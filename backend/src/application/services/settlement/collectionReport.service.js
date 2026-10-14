const Invoice = require("../../../infrastructure/database/mongoose/models/invoice/Invoice");
const Payment = require("../../../infrastructure/database/mongoose/models/payment/Payment");
const InvoiceReminder = require("../../../infrastructure/database/mongoose/models/invoice/InvoiceReminder");
const auditLogService = require("../common/auditLog.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const { INVOICE_STATUS } = require("../../../shared/constants/invoice");

class CollectionReportService {
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
   * List outstanding invoices with positive balance due.
   */
  static async getOutstandingInvoices(filters = {}, user = null, authContext = {}) {
    const query = {
      isDeleted: false,
      status: { $in: [INVOICE_STATUS.FINALIZED, INVOICE_STATUS.PARTIALLY_PAID] },
      balanceDue: { $gt: 0 },
    };

    if (filters.branchId) {
      this.assertBranchAccess(filters.branchId, authContext, user);
      query.branchId = filters.branchId;
    } else if (!authContext.isSuperAdmin && authContext.userBranchIds && authContext.userBranchIds.length > 0) {
      query.branchId = { $in: authContext.userBranchIds };
    }

    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

    if (filters.dueFrom || filters.dueTo) {
      query.dueDate = {};
      if (filters.dueFrom) query.dueDate.$gte = new Date(filters.dueFrom);
      if (filters.dueTo) query.dueDate.$lte = new Date(filters.dueTo);
    }

    if (filters.overdue === "true" || filters.overdue === true) {
      query.dueDate = query.dueDate || {};
      query.dueDate.$lt = new Date();
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Invoice.find(query)
        .populate("customerId", "name mobile email")
        .populate("branchId", "name code")
        .sort({ dueDate: 1, invoiceDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    const now = Date.now();
    const formatted = items.map((inv) => {
      let daysOverdue = 0;
      if (inv.dueDate && new Date(inv.dueDate).getTime() < now) {
        daysOverdue = Math.floor((now - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        jobOrderId: inv.jobOrderId,
        jobNo: inv.jobNo,
        customerName: inv.customerId?.name || inv.customerSnapshot?.name,
        customerPhone: inv.customerId?.mobile || inv.customerSnapshot?.mobile,
        branchName: inv.branchId?.name || inv.branchSnapshot?.name,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        grandTotal: inv.grandTotal,
        amountPaid: inv.paidAmount,
        balanceDue: inv.balanceDue,
        paymentStatus: inv.paymentStatus || (inv.paidAmount > 0 ? "PARTIAL" : "UNPAID"),
        daysOverdue,
      };
    });

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Collection summary report.
   */
  static async getCollectionSummary(filters = {}, user = null, authContext = {}) {
    const query = {
      status: { $nin: ["VOID", "FAILED", "REVERSED"] },
    };

    if (filters.branchId) {
      this.assertBranchAccess(filters.branchId, authContext, user);
      query.branchId = filters.branchId;
    } else if (!authContext.isSuperAdmin && authContext.userBranchIds && authContext.userBranchIds.length > 0) {
      query.branchId = { $in: authContext.userBranchIds };
    }

    if (filters.paymentMode) query.paymentMode = filters.paymentMode.toUpperCase();
    if (filters.collectedBy) query.collectedBy = filters.collectedBy;

    if (filters.from || filters.to) {
      query.paymentDate = {};
      if (filters.from) query.paymentDate.$gte = new Date(filters.from);
      if (filters.to) query.paymentDate.$lte = new Date(filters.to);
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [payments, totalCount, modeStats] = await Promise.all([
      Payment.find(query)
        .populate("collectedBy", "name email")
        .populate("branchId", "name code")
        .populate("invoiceId", "invoiceNumber")
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$paymentMode",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalCollected = Math.round(
      modeStats.reduce((sum, s) => sum + (s.totalAmount || 0), 0) * 100
    ) / 100;

    const byPaymentMode = {};
    ["CASH", "CARD", "UPI", "BANK"].forEach((m) => {
      const found = modeStats.find((s) => s._id === m);
      byPaymentMode[m] = {
        totalAmount: found ? Math.round(found.totalAmount * 100) / 100 : 0,
        count: found ? found.count : 0,
      };
    });

    return {
      totalCollected,
      totalCount,
      byPaymentMode,
      items: payments,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Schedule or record a payment reminder for an invoice.
   */
  static async createReminder(invoiceId, reminderData = {}, user = null, authContext = {}) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.isDeleted) {
      throw ErrorHelper.notFound("Invoice not found with ID: " + invoiceId);
    }

    this.assertBranchAccess(invoice.branchId, authContext, user);

    if (invoice.balanceDue <= 0 || invoice.paymentStatus === "PAID") {
      throw ErrorHelper.badRequest("Cannot schedule reminder: Invoice is already fully PAID.");
    }

    const reminderType = reminderData.reminderType || "PAYMENT_FOLLOW_UP";
    const channel = reminderData.channel || "MANUAL";
    const scheduledAt = reminderData.scheduledAt ? new Date(reminderData.scheduledAt) : new Date();

    // Check duplicate pending reminder within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await InvoiceReminder.findOne({
      invoiceId: invoice._id,
      reminderType,
      status: "PENDING",
      scheduledAt: { $gte: twentyFourHoursAgo },
    });
    if (existing) {
      throw ErrorHelper.conflict("A pending " + reminderType + " reminder already exists for this invoice within the last 24 hours.");
    }

    const reminder = await InvoiceReminder.create({
      invoiceId: invoice._id,
      jobOrderId: invoice.jobOrderId,
      customerId: invoice.customerId,
      branchId: invoice.branchId,
      reminderType,
      channel,
      status: "PENDING",
      scheduledAt,
      remarks: reminderData.remarks || "",
      createdBy: user._id || user.id,
    });

    await auditLogService.log({
      action: "REMINDER_CREATE",
      resource: "InvoiceReminder",
      resourceId: reminder._id,
      userId: user._id || user.id,
      userName: user.name || user.username || "System",
      branchId: invoice.branchId,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        reminderType,
        channel,
        scheduledAt,
      },
    });

    return reminder;
  }

  /**
   * List reminders for an invoice.
   */
  static async getReminders(invoiceId, user = null, authContext = {}) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.isDeleted) {
      throw ErrorHelper.notFound("Invoice not found with ID: " + invoiceId);
    }
    this.assertBranchAccess(invoice.branchId, authContext, user);

    return InvoiceReminder.find({ invoiceId: invoice._id })
      .populate("createdBy", "name email")
      .sort({ scheduledAt: -1 })
      .lean();
  }
}

module.exports = CollectionReportService;
