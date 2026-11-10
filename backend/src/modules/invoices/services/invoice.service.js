const mongoose = require("mongoose");
const invoiceRepository = require("../models/Invoice");
const JobOrder = require("../../job-orders/models/JobOrder");
const { JobItem } = require("../../job-orders/models/JobItem");
const Customer = require("../../customers/models/Customer");
const Branch = require("../../branches/models/Branch");
const DeliveryOrder = require("../../delivery/models/DeliveryOrder");
const CommonApproval = require("../../approvals/models/Approval");
const numberSequenceService = require("../../number-sequences/services/numberSequence.service");
const InvoiceCalculationService = require("./invoiceCalculation.service");
const InvoicePdfService = require("./invoicePdf.service");
const { INVOICE_STATUS, INVOICE_TYPE, VARIANCE_POLICY } = require("../models/invoice.constants");
const ErrorHelper = require("../../../utils/errors/ApiError");
const Payment = require("../models/Payment");
const { nextInvoiceNumber, nextPaymentNo } = require("./documentNumbers");
const { getFlowType, FLOW_TYPES } = require("../../job-orders/models/jobFlows");

// Stages a job can only reach after its estimate has been approved
const POST_APPROVAL_STAGES = [
  "DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION",
  "PRODUCTION_PLANNING", "PRINTING", "FINISHING", "PACKING", "QC", "REWORK", "REPRINT",
  "READY", "DELIVERY", "COMPLETED", "DELIVERED", "INVOICED", "CLOSED",
];

const isEstimateApproved = (job) =>
  job.estimationStatus === "APPROVED" ||
  POST_APPROVAL_STAGES.includes(String(job.currentStage || job.stage || "").toUpperCase());

const PAYMENT_MODES = ["CASH", "CARD", "UPI", "BANK"];
const normalizeMode = (mode) => {
  const m = String(mode || "CASH").toUpperCase();
  return PAYMENT_MODES.includes(m) ? m : "CASH";
};
const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

// The GST rate (percent) of an invoice: one rate for everything on it
const resolveGstRate = (requested, fallback = 0) => {
  const raw = requested !== undefined && requested !== null && requested !== "" ? requested : fallback;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw ErrorHelper.badRequest("GST rate must be a number from 0 to 100.");
  }
  return rate;
};

// Full payment or advance. When nothing is chosen, a Print Only invoice defaults to full payment.
const normalizePlan = (plan, job) => {
  const p = String(plan || "").toUpperCase();
  if (p === "FULL" || p === "ADVANCE") return p;
  return getFlowType(job) === FLOW_TYPES.PRINT_ONLY ? "FULL" : "ADVANCE";
};

// A full-payment invoice counts everything as received now
const applyPaymentPlan = (calc, plan) => {
  if (plan !== "FULL") return calc;
  calc.advanceApplied = calc.grandTotal;
  calc.balanceDue = Math.max(0, round2(calc.grandTotal - calc.advanceApplied - (calc.paidAmount || 0)));
  return calc;
};

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
      // Only jobs whose estimate has been approved can be invoiced
      $and: [
        {
          $or: [
            { estimationStatus: "APPROVED" },
            { currentStage: { $in: POST_APPROVAL_STAGES } },
            { stage: { $in: POST_APPROVAL_STAGES } },
          ],
        },
      ],
    };

    if (!authContext.isSuperAdmin && authContext.userBranchIds && authContext.userBranchIds.length > 0) {
      filter.branchId = { $in: authContext.userBranchIds };
    } else if (query.branchId) {
      filter.branchId = query.branchId;
    }

    if (query.customerId) filter.customerId = query.customerId;
    if (query.search) {
      const reg = new RegExp(String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$and.push({ $or: [{ jobNo: reg }, { "customerSnapshot.name": reg }] });
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

      const jobTypeStr = String(job.jobType || job.specs?.jobType || "").toUpperCase();
      const isDesignOnly = jobTypeStr.includes("DESIGN") && !jobTypeStr.includes("PRINT");
      const hasPendingBalance = (Number(job.balanceDue ?? existing?.balanceDue ?? 0) > 0) || job.paymentStatus !== "PAID";
      const isEligible = isDesignOnly
        ? (!isAlreadyFinalized || (hasPendingBalance && job.designStatus === "COMPLETED"))
        : !isAlreadyFinalized;

      const existingAdv = Number(existing?.advanceApplied || existing?.advancePaid || 0);
      const jobAdv = Number(job.advancePaid || 0);
      const resolvedAdv = Math.max(jobAdv, existingAdv);
      const effectiveGrandTotal = existing && Number(existing.grandTotal) > 0
        ? Number(existing.grandTotal)
        : Number(job.grandTotal || job.estimatedPrice || job.subtotal || 0);
      const finalBal = existing && existing.balanceDue != null
        ? Number(existing.balanceDue)
        : Math.max(0, Math.round((effectiveGrandTotal - resolvedAdv) * 100) / 100);
      const finalAdv = resolvedAdv > 0 ? resolvedAdv : Math.max(0, Math.round((effectiveGrandTotal - finalBal) * 100) / 100);

      return {
        _id: job._id,
        id: job._id,
        jobOrderId: job._id,
        jobNo: job.jobNo,
        jobType: job.jobType || job.specs?.jobType || "Print Only",
        specs: job.specs || {},
        title: job.title,
        orderDate: job.orderDate,
        branchId: job.branchId,
        customerId: job.customerId,
        customerSnapshot: job.customerSnapshot,
        customerName: job.customerName || job.customerSnapshot?.name,
        customerPhone: job.customerPhone || job.customerSnapshot?.mobile,
        currentStage: job.currentStage,
        stage: job.stage || job.currentStage,
        status: job.status,
        designStatus: job.designStatus,
        quantity: job.quantity || job.specs?.quantity || 1,
        advancePaid: finalAdv,
        balanceDue: finalBal,
        paymentStatus: job.paymentStatus || (finalBal <= 0 ? "PAID" : finalAdv > 0 ? "PARTIAL" : "UNPAID"),
        estimatedPrice: effectiveGrandTotal,
        subtotal: existing && Number(existing.subtotal) > 0 ? Number(existing.subtotal) : (job.subtotal || effectiveGrandTotal),
        taxAmount: job.taxAmount || 0,
        grandTotal: effectiveGrandTotal,
        discountTotal: existing ? Number(existing.discountTotal || 0) : Number(job.discountTotal || 0),
        itemCount: (job.items || []).length,
        items: job.items || [],
        finishingServices: job.finishingServices || [],
        eligible: isEligible,
        ineligibilityReason: !isEligible ? "ALREADY_FINALIZED" : null,
        existingInvoice: existing
          ? {
              id: existing._id,
              invoiceNumber: existing.invoiceNumber,
              status: existing.status,
              grandTotal: existing.grandTotal,
              discountTotal: existing.discountTotal,
              balanceDue: existing.balanceDue,
              advancePaid: existing.advancePaid || existing.advanceApplied,
              advanceApplied: existing.advanceApplied || existing.advancePaid,
              paidAmount: existing.paidAmount || existing.amountPaid,
            }
          : null,
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
    if (!isEstimateApproved(job)) reasons.push("ESTIMATE_NOT_APPROVED");

    // Check existing invoice
    const existingInvoice = await invoiceRepository.findActiveByJobOrderId(job._id);
    if (existingInvoice && [INVOICE_STATUS.FINALIZED, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID].includes(existingInvoice.status)) {
      reasons.push("ALREADY_INVOICED");
    }

    const items = await JobItem.find({ jobOrderId: job._id }).lean();
    let resolvedItems = (items.length > 0 ? items : (job.items || [])).map((it) => ({
      jobOrderItemId: it._id,
      itemId: it.itemId || it._id,
      itemName: it.itemName || it.title || "Print Item",
      description: it.description || "",
      quantity: it.quantity || 1,
      unit: it.unit || "pcs",
      unitPrice: it.unitRate || it.unitPrice || 0,
      unitRate: it.unitRate || it.unitPrice || 0,
      taxRate: Number(it.taxRate) || 0,
      amount: it.amount || it.totalPrice || 0,
    }));

    const specs = job.specs || {};
    const q = Math.max(1, Number(job.quantity || specs.quantity || 1));
    const specParts = [
      specs.paperType ? `Paper: ${specs.paperType}` : null,
      specs.paperGsm ? `${specs.paperGsm}` : null,
      specs.size ? `Size: ${specs.size}` : null,
      specs.color ? `Color: ${specs.color}` : null,
      specs.printingSide ? `${specs.printingSide}` : null,
    ].filter(Boolean);
    const specDesc = specParts.length > 0 ? specParts.join(" • ") : "";

    const finishingList = Array.isArray(job.finishingServices) && job.finishingServices.length > 0
      ? job.finishingServices
      : (Array.isArray(job.items?.[0]?.finishing) && job.items[0].finishing.length > 0
          ? job.items[0].finishing.map((f) => ({
              name: f.name || f.code || "Finishing",
              config: f.notes || f.config || "Standard",
              unitPrice: Number(f.unitPrice || 0),
              quantity: Number(f.quantity || q),
              total: Number(f.unitPrice || 0) * Number(f.quantity || q),
            }))
          : []);

    if (resolvedItems.length === 0) {
      const tot = Number(job.grandTotal || job.estimatedPrice || job.subtotal || 0);
      const finishingSum = finishingList.reduce(
        (acc, f) => acc + Number(f.total || (Number(f.quantity || q) * Number(f.unitPrice || 0))),
        0
      );
      const baseAmt = Math.max(0, tot - finishingSum);
      const baseRate = q > 0 ? Math.round((baseAmt / q) * 100) / 100 : baseAmt;
      const baseItem = {
        itemName: `${job.title || "Print Job Order"} - Base Printing`,
        description: specDesc,
        quantity: q,
        unit: "PCS",
        unitPrice: baseRate,
        unitRate: baseRate,
        taxRate: 0,
        amount: baseAmt > 0 ? baseAmt : tot,
      };
      resolvedItems = [baseItem];
      if (finishingList.length > 0) {
        finishingList.forEach((f) => {
          const fQty = Number(f.quantity || q);
          const fRate = Number(f.unitPrice || 0);
          const fTot = Number(f.total || (fQty * fRate));
          resolvedItems.push({
            itemName: `Finishing: ${f.name || "Finishing Service"}`,
            description: f.config || f.notes || "Standard",
            quantity: fQty,
            unit: (f.unit || "PCS").toUpperCase(),
            unitPrice: fRate,
            unitRate: fRate,
            taxRate: 0,
            amount: fTot,
          });
        });
      }
    } else {
      if (specDesc && !resolvedItems[0].description) {
        resolvedItems[0].description = specDesc;
      }
      const hasFinishing = resolvedItems.some((it) => it.itemName?.toLowerCase().includes("finishing"));
      if (!hasFinishing && finishingList.length > 0) {
        finishingList.forEach((f) => {
          const fQty = Number(f.quantity || q);
          const fRate = Number(f.unitPrice || 0);
          const fTot = Number(f.total || (fQty * fRate));
          resolvedItems.push({
            itemName: `Finishing: ${f.name || "Finishing Service"}`,
            description: f.config || f.notes || "Standard",
            quantity: fQty,
            unit: (f.unit || "PCS").toUpperCase(),
            unitPrice: fRate,
            unitRate: fRate,
            taxRate: 0,
            amount: fTot,
          });
        });
      }
    }

    return {
      _id: job._id,
      id: job._id,
      jobOrderId: job._id,
      jobNo: job.jobNo,
      jobType: job.jobType || job.specs?.jobType || "Print Only",
      title: job.title || job.productType || "Print Job Order",
      productType: job.productType,
      quantity: job.quantity || job.specs?.quantity || 1,
      specs: job.specs || {},
      finishingServices: job.finishingServices || [],
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
      customerSnapshot: job.customerSnapshot || {
        name: job.customerName || "Customer",
        mobile: job.customerPhone || "",
      },
      customerName: job.customerName || job.customerSnapshot?.name || "Customer",
      customerPhone: job.customerPhone || job.customerSnapshot?.mobile || "",
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
    if (!isEstimateApproved(job)) {
      throw ErrorHelper.conflict("Cannot create invoice: the estimate of this job order has not been approved yet.");
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

    // The invoice bills exactly what the approved estimate contains: the product and its finishing lines.
    // Nothing about the lines can be changed here: not the wording, quantity, price, nor the lines themselves.
    const eligibility = await this.getJobOrderEligibility(job._id, authContext);
    const draftItems = (eligibility.items || []).map((it) => ({
        jobOrderItemId: it.jobOrderItemId || null,
        itemId: it.itemId || null,
        itemCode: "",
        itemName: it.itemName || "Print Item",
        description: it.description || "",
        unit: it.unit || "PCS",
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitRate || it.unitPrice) || 0,
        taxRate: 0,
        discountType: "FIXED",
        discountValue: 0,
    }));

    const estimateAmount = job.estimatedPrice || job.grandTotal || 0;

    // Check if active draft or finalized invoice already exists
    const existingActive = await invoiceRepository.findActiveByJobOrderId(job._id);
    if (existingActive) {
      if (existingActive.status === INVOICE_STATUS.DRAFT) {
        return existingActive; // Reuse existing draft
      }

      // If at settlement stage or regenerate explicitly requested, regenerate invoice for final settlement
      const isSettlementStage =
        Boolean(payload.regenerate) ||
        ["READY", "READY_FOR_DELIVERY", "DELIVERY", "DELIVERED", "COMPLETED"].includes(String(job.currentStage || "").toUpperCase()) ||
        ["READY", "READY_FOR_DELIVERY", "DELIVERY", "DELIVERED", "COMPLETED"].includes(String(job.status || "").toUpperCase());

      if (isSettlementStage) {
        const advanceAlreadyReceived = Number(job.advancePaid || existingActive.advanceApplied || 0);
        const paidSoFar = Number(existingActive.paidAmount || 0);

        const calc = InvoiceCalculationService.calculateInvoice({
          items: draftItems && draftItems.length > 0 ? draftItems : existingActive.items,
          additionalCharges,
          customerSnapshot: existingActive.customerSnapshot || customerSnapshot,
          branchSnapshot: existingActive.branchSnapshot || branchSnapshot,
          estimateAmount,
          advanceReceived: Math.max(advanceAlreadyReceived, await Payment.sumInvoiceTimePayments(existingActive._id)),
          paidAmount: paidSoFar,
          discountType: payload.discountType !== undefined ? payload.discountType : existingActive.invoiceDiscountType,
          discountValue: payload.discountValue !== undefined ? payload.discountValue : existingActive.invoiceDiscountValue,
          gstRate: resolveGstRate(payload.gstRate, existingActive.gstRate),
        });
        existingActive.gstRate = resolveGstRate(payload.gstRate, existingActive.gstRate);
        const regeneratePlan = normalizePlan(payload.paymentPlan !== undefined ? payload.paymentPlan : existingActive.paymentPlan, job);
        applyPaymentPlan(calc, regeneratePlan);
        existingActive.paymentPlan = regeneratePlan;

        existingActive.items = calc.items;
        existingActive.additionalCharges = calc.additionalCharges;
        existingActive.subtotal = calc.subtotal;
        existingActive.discountTotal = calc.discountTotal;
        existingActive.additionalChargesTotal = calc.additionalChargesTotal;
        existingActive.taxableAmount = calc.taxableAmount;
        existingActive.cgstTotal = calc.cgstTotal;
        existingActive.sgstTotal = calc.sgstTotal;
        existingActive.igstTotal = calc.igstTotal;
        existingActive.taxTotal = calc.taxTotal;
        existingActive.grandTotal = calc.grandTotal;
        existingActive.advanceApplied = calc.advanceApplied;
        existingActive.paidAmount = calc.paidAmount;
        existingActive.balanceDue = calc.balanceDue;
        existingActive.varianceAmount = calc.varianceAmount;
        existingActive.variancePercentage = calc.variancePercentage;
        existingActive.approvalRequired = calc.approvalRequired;
        existingActive.invoiceDiscountType = String(payload.discountType !== undefined ? payload.discountType : existingActive.invoiceDiscountType || "FIXED").toUpperCase() === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
        existingActive.invoiceDiscountValue = Number(payload.discountValue !== undefined ? payload.discountValue : existingActive.invoiceDiscountValue) || 0;
        if (payload.paymentMode !== undefined) existingActive.paymentMode = normalizeMode(payload.paymentMode);
        if (payload.paymentReference !== undefined) existingActive.paymentReference = String(payload.paymentReference || "");
        existingActive.status = INVOICE_STATUS.DRAFT; // Reset to DRAFT so user can review and finalize
        existingActive.remarks = remarks || existingActive.remarks || "Regenerated Final Settlement Invoice";
        existingActive.updatedBy = user?._id || null;
        await existingActive.save();

        return existingActive;
      }

      throw ErrorHelper.conflict(
        `Cannot create new invoice: Invoice already exists with status '${existingActive.status}' (${existingActive.invoiceNumber || "DRAFT"}).`,
        { existingInvoice: InvoiceDto.toResponse(existingActive) }
      );
    }

    const calc = InvoiceCalculationService.calculateInvoice({
      items: draftItems,
      additionalCharges,
      customerSnapshot,
      branchSnapshot,
      estimateAmount,
      advanceReceived: payload.advancePaid !== undefined
        ? Number(payload.advancePaid)
        : (payload.advanceApplied !== undefined ? Number(payload.advanceApplied) : (Number(job.advancePaid) || 0)),
      paidAmount: 0,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      gstRate: resolveGstRate(payload.gstRate, 0),
    });
    const paymentPlan = normalizePlan(payload.paymentPlan, job);
    applyPaymentPlan(calc, paymentPlan);

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
      invoiceDiscountType: String(payload.discountType || "FIXED").toUpperCase() === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
      invoiceDiscountValue: Number(payload.discountValue) || 0,
      gstRate: resolveGstRate(payload.gstRate, 0),
      paymentPlan,
      paymentMode: normalizeMode(payload.paymentMode),
      paymentReference: String(payload.paymentReference || ""),
      remarks,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
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

    // The lines, wording, quantities and prices stay exactly as the approved job order gave them
    const items = (invoice.items || []).map((it) => (it.toObject ? it.toObject() : { ...it }));
    const gstRate = resolveGstRate(updatePayload.gstRate, invoice.gstRate);
    const additionalCharges = updatePayload.additionalCharges !== undefined ? updatePayload.additionalCharges : invoice.additionalCharges;

    const calc = InvoiceCalculationService.calculateInvoice({
      items,
      additionalCharges,
      customerSnapshot: invoice.customerSnapshot,
      branchSnapshot: invoice.branchSnapshot,
      estimateAmount: invoice.estimateAmountSnapshot,
      // Money already recorded as received can never be reduced by editing the draft
      advanceReceived: Math.max(
        updatePayload.advancePaid !== undefined
          ? Number(updatePayload.advancePaid)
          : (updatePayload.advanceApplied !== undefined ? Number(updatePayload.advanceApplied) : invoice.advanceApplied),
        await Payment.sumInvoiceTimePayments(invoice._id)
      ),
      paidAmount: invoice.paidAmount,
      discountType: updatePayload.discountType !== undefined ? updatePayload.discountType : invoice.invoiceDiscountType,
      discountValue: updatePayload.discountValue !== undefined ? updatePayload.discountValue : invoice.invoiceDiscountValue,
      gstRate,
    });
    const jobForPlan = invoice.jobOrderId ? await JobOrder.findById(invoice.jobOrderId).lean() : null;
    const paymentPlan = normalizePlan(updatePayload.paymentPlan !== undefined ? updatePayload.paymentPlan : invoice.paymentPlan, jobForPlan || {});
    applyPaymentPlan(calc, paymentPlan);

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
      invoiceDiscountType: String(updatePayload.discountType !== undefined ? updatePayload.discountType : invoice.invoiceDiscountType || "FIXED").toUpperCase() === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
      invoiceDiscountValue: Number(updatePayload.discountValue !== undefined ? updatePayload.discountValue : invoice.invoiceDiscountValue) || 0,
      gstRate,
      paymentPlan,
      paymentMode: updatePayload.paymentMode !== undefined ? normalizeMode(updatePayload.paymentMode) : invoice.paymentMode,
      paymentReference: updatePayload.paymentReference !== undefined ? String(updatePayload.paymentReference || "") : invoice.paymentReference,
      remarks: updatePayload.remarks !== undefined ? updatePayload.remarks : invoice.remarks,
      dueDate: updatePayload.dueDate !== undefined ? new Date(updatePayload.dueDate) : invoice.dueDate,
      updatedBy: user?._id || null,
    };

    const updated = await invoiceRepository.updateById(invoice._id, updateData);

    if (invoice.jobOrderId) {
      await JobOrder.findByIdAndUpdate(invoice.jobOrderId, {
        $set: {
          grandTotal: calc.grandTotal,
          totalAmount: calc.grandTotal,
          discountTotal: calc.discountTotal,
          balanceDue: calc.balanceDue,
          advancePaid: calc.advanceApplied,
          invoiceNo: invoice.invoiceNumber,
          invoiceId: invoice._id,
        },
      });
    }

    return updated;
  }

  /**
   * 5. Calculate invoice totals and preview variance without persisting.
   */
  static async calculate(id, calculatePayload = {}, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    const items = (invoice.items || []).map((it) => (it.toObject ? it.toObject() : { ...it }));
    const additionalCharges = calculatePayload.additionalCharges || invoice.additionalCharges;

    const calc = InvoiceCalculationService.calculateInvoice({
      items,
      additionalCharges,
      customerSnapshot: invoice.customerSnapshot,
      branchSnapshot: invoice.branchSnapshot,
      estimateAmount: invoice.estimateAmountSnapshot,
      advanceReceived: calculatePayload.advancePaid !== undefined
        ? Number(calculatePayload.advancePaid)
        : (calculatePayload.advanceApplied !== undefined ? calculatePayload.advanceApplied : invoice.advanceApplied),
      paidAmount: invoice.paidAmount,
      discountType: calculatePayload.discountType !== undefined ? calculatePayload.discountType : invoice.invoiceDiscountType,
      discountValue: calculatePayload.discountValue !== undefined ? calculatePayload.discountValue : invoice.invoiceDiscountValue,
      gstRate: resolveGstRate(calculatePayload.gstRate, invoice.gstRate),
    });
    const jobForCalc = invoice.jobOrderId ? await JobOrder.findById(invoice.jobOrderId).lean() : null;
    return applyPaymentPlan(
      calc,
      normalizePlan(calculatePayload.paymentPlan !== undefined ? calculatePayload.paymentPlan : invoice.paymentPlan, jobForCalc || {})
    );
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

    return invoice;
  }

  /**
   * 8. Finalize Invoice atomically.
   */
  static async finalize(id, user, authContext = {}) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw ErrorHelper.notFound("Invoice not found.");

    this.assertBranchAccess(invoice.branchId, authContext);

    // Re-verify Job Order
    const job = await JobOrder.findById(invoice.jobOrderId);
    if (!job || job.status === "CANCELLED") {
      throw ErrorHelper.conflict("Cannot finalize invoice: Job Order is invalid or cancelled.");
    }
    if (!isEstimateApproved(job)) {
      throw ErrorHelper.conflict("Cannot finalize invoice: the estimate of this job order has not been approved yet.");
    }

    const jobTypeStr = String(job.jobType || "").toUpperCase();
    const isPrintOnly = jobTypeStr.includes("PRINT") && !jobTypeStr.includes("DESIGN");
    const isDesignOnly = jobTypeStr.includes("DESIGN") && !jobTypeStr.includes("PRINT");

    if ([INVOICE_STATUS.FINALIZED, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID].includes(invoice.status)) {
      if (isDesignOnly && (Number(invoice.balanceDue || 0) > 0 || job.paymentStatus !== "PAID")) {
        // Allow collecting the remaining balance and finalizing the paid status
        invoice.status = INVOICE_STATUS.DRAFT;
      } else {
        throw ErrorHelper.conflict(`Invoice is already finalized with number: ${invoice.invoiceNumber}`);
      }
    }

    if (invoice.status === INVOICE_STATUS.PENDING_APPROVAL) {
      throw ErrorHelper.conflict("Cannot finalize invoice: Pending variance approval must be approved first.");
    }

    // Concurrency-safe atomic number generation using numberSequenceService
    const invoiceNumber = invoice.invoiceNumber || (await nextInvoiceNumber());

    invoice.invoiceNumber = invoiceNumber;
    invoice.finalizedBy = user?._id || null;
    invoice.finalizedAt = new Date();

    // Full payment: everything is received now. Advance: only the amount entered (never more than the invoice).
    const grandTotal = round2(invoice.grandTotal || 0);
    const plan = normalizePlan(invoice.paymentPlan, job);
    const isFull = plan === "FULL";
    const received = isFull ? grandTotal : round2(Math.min(grandTotal, Number(invoice.advanceApplied) || 0));
    const alreadyPaid = round2(Number(invoice.paidAmount) || 0);
    const balance = Math.max(0, round2(grandTotal - received - alreadyPaid));

    invoice.paymentPlan = plan;
    invoice.advanceApplied = invoice.advancePaid = received;
    invoice.balanceDue = balance;
    invoice.paymentStatus = balance <= 0.001 ? "PAID" : received + alreadyPaid > 0 ? "PARTIAL" : "UNPAID";
    invoice.status = invoice.paymentStatus === "PAID" ? INVOICE_STATUS.PAID : INVOICE_STATUS.FINALIZED;
    await invoice.save();

    // Every rupee received at this step is kept as a payment record (mode and reference included)
    await this.recordInvoiceTimePayment(invoice, user, isFull);

    const jobPayment = { advancePaid: received, balanceDue: balance, paymentStatus: invoice.paymentStatus };

    // After the invoice: Print Only goes straight to production (no design); the other types go to design.
    const nextJobStage = isPrintOnly
      ? "PRODUCTION_PLANNING"
      : (job.source === "DESIGNER" ? "DESIGN_IN_PROGRESS" : "DESIGN_QUEUE");
    const paidText = isFull ? `full payment ₹${received.toFixed(2)}` : `advance ₹${received.toFixed(2)}`;
    const notesText = `Invoice ${invoiceNumber} finalized with ${paidText}. ${isPrintOnly ? "Sent to Production." : "Sent to Designer Queue."}`;

    if (["ESTIMATION", "ESTIMATE_APPROVAL"].includes(job.currentStage)) {
      try {
        const JobWorkflowService = require("../../job-orders/services/jobWorkflow.service");
        await JobWorkflowService.transition(job._id, nextJobStage, {
          actorId: user?._id,
          notes: notesText,
          patch: { invoiceNo: invoiceNumber, invoiceId: invoice._id, ...jobPayment },
          user,
        });
      } catch (transErr) {
        console.warn("Could not transition workflow on invoice finalize:", transErr.message);
        await JobOrder.findByIdAndUpdate(job._id, {
          $set: {
            currentStage: nextJobStage,
            stage: nextJobStage,
            status: isPrintOnly ? "PRODUCTION" : "DESIGN",
            invoiceNo: invoiceNumber,
            invoiceId: invoice._id,
            ...jobPayment,
          },
        });
      }
    } else {
      const updateFields = {
        invoiceNo: invoiceNumber,
        invoiceId: invoice._id,
        grandTotal,
        totalAmount: grandTotal,
        discountTotal: Number(invoice.discountTotal || 0),
        ...jobPayment,
      };
      if (isDesignOnly) {
        // Design Only has nothing to produce or deliver: it completes once the balance is cleared
        if (balance <= 0.001) {
          updateFields.currentStage = "COMPLETED";
          updateFields.stage = "COMPLETED";
          updateFields.status = "COMPLETED";
          updateFields.paymentStatus = "PAID";
          updateFields.balanceDue = 0;
          updateFields.completionDate = new Date();
          try {
            const JobWorkflowService = require("../../job-orders/services/jobWorkflow.service");
            await JobWorkflowService.transition(job._id, "COMPLETED", {
              actorId: user?._id,
              notes: `Final balance collected on invoice ${invoiceNumber}. Design Only order completed.`,
              patch: updateFields,
              user,
            });
          } catch (e) {}
        } else {
          updateFields.currentStage = "READY";
          updateFields.stage = "READY";
          updateFields.status = "READY";
          updateFields.paymentStatus = "PARTIAL";
        }
      }
      await JobOrder.findByIdAndUpdate(job._id, { $set: updateFields });
    }

    return invoice;
  }

  /**
   * Record the advance (or the full payment of a full-payment invoice) as a payment, so the money received
   * is always backed by a payment record. Only the part not recorded yet is added.
   */
  static async recordInvoiceTimePayment(invoice, user, isFull = false) {
    const target = isFull
      ? round2(invoice.grandTotal || 0)
      : round2(Math.min(Number(invoice.grandTotal) || 0, Number(invoice.advanceApplied) || 0));
    if (!(target > 0)) return null;

    const recorded = await Payment.sumInvoiceTimePayments(invoice._id);
    const diff = round2(target - recorded);
    if (!(diff > 0.001)) return null;

    const paymentNo = await nextPaymentNo();

    const mode = normalizeMode(invoice.paymentMode);
    const payment = await Payment.create({
      paymentNo,
      invoiceId: invoice._id,
      jobOrderId: invoice.jobOrderId,
      customerId: invoice.customerId,
      branchId: invoice.branchId,
      amount: diff,
      paymentMode: mode,
      paymentMethod: mode,
      paymentReference: invoice.paymentReference || null,
      paymentType: isFull ? "FULL" : "ADVANCE",
      status: "COMPLETED",
      collectedBy: user?._id || invoice.finalizedBy || invoice.createdBy,
      remarks: isFull ? "Full payment received with the invoice" : "Advance received with the invoice",
    });

    return payment;
  }

  /**
   * Amount still to be collected on a job order, from its invoices and recorded payments.
   * Used to stop delivery, completion and closure while a balance is unpaid.
   */
  static async getOutstandingForJob(jobOrderId) {
    const invoices = await invoiceRepository.find({
      jobOrderId,
      status: { $ne: INVOICE_STATUS.CANCELLED },
      isDeleted: { $ne: true },
    });
    // Invoices that have been issued (a regenerated final invoice is a draft that still carries its number)
    const issued = invoices.filter((inv) => inv.invoiceNumber || [INVOICE_STATUS.FINALIZED, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID].includes(inv.status));

    // Payments for all the job's invoices in one query, not one per invoice
    const paymentsByInvoice = await Payment.findValidPaymentsByInvoiceIds(issued.map((inv) => inv._id));

    let outstanding = 0;
    for (const inv of issued) {
      const balancePayments = paymentsByInvoice.get(String(inv._id)) || [];
      const paid = balancePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      outstanding += Math.max(0, round2((Number(inv.grandTotal) || 0) - (Number(inv.advanceApplied || inv.advancePaid) || 0) - paid));
    }
    return {
      hasInvoice: issued.length > 0,
      outstanding: round2(outstanding),
      invoiceNumber: issued[0]?.invoiceNumber || null,
    };
  }

  /**
   * A Design Only job whose design is approved and whose invoice is fully paid (a full payment taken with the
   * invoice, or a balance already collected) has nothing left to do: complete it.
   */
  static async completeDesignOnlyIfSettled(jobOrderId, user = null) {
    const job = await JobOrder.findById(jobOrderId);
    if (!job || getFlowType(job) !== FLOW_TYPES.DESIGN_ONLY) return false;
    if (String(job.currentStage || "").toUpperCase() !== "READY") return false;

    const { hasInvoice, outstanding } = await this.getOutstandingForJob(job._id);
    if (!hasInvoice || outstanding > 0.001) return false;

    // A regenerated final invoice is a draft that already carries its number: it is paid, so close it as PAID
    await invoiceRepository.updateMany(
      { jobOrderId: job._id, invoiceNumber: { $nin: [null, ""] }, status: INVOICE_STATUS.DRAFT },
      { $set: { status: INVOICE_STATUS.PAID, paymentStatus: "PAID", balanceDue: 0 } }
    );

    const patch = { paymentStatus: "PAID", balanceDue: 0, completionDate: new Date() };
    try {
      const JobWorkflowService = require("../../job-orders/services/jobWorkflow.service");
      await JobWorkflowService.transition(job._id, "COMPLETED", {
        actorId: user?._id,
        notes: "Design approved and invoice fully paid. Design Only order completed.",
        patch,
        user,
      });
    } catch (e) {
      await JobOrder.findByIdAndUpdate(job._id, {
        $set: { ...patch, currentStage: "COMPLETED", stage: "COMPLETED", status: "COMPLETED" },
      });
    }
    return true;
  }

  /**
   * Refuse when money is still owed on the job. Settle the balance first, then deliver.
   */
  static async assertBalanceSettled(job, action) {
    const { hasInvoice, outstanding } = await this.getOutstandingForJob(job._id || job);
    if (hasInvoice && outstanding > 0.001) {
      throw ErrorHelper.conflict(
        `Cannot ${action}: ₹${outstanding.toFixed(2)} is still due on this job order. Collect the balance payment first.`
      );
    }
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

    return {
      success: true,
      channel,
      recipient,
      message: `Invoice ${invoice.invoiceNumber || "DRAFT"} dispatched via ${channel} to ${recipient}.`,
    };
  }
}

module.exports = InvoiceService;
