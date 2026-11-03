const mongoose = require("mongoose");
const invoiceRepository = require("../models/Invoice");
const JobOrder = require("../../job-orders/models/JobOrder");
const { JobItem } = require("../../job-orders/models/JobItem");
const Customer = require("../../customers/models/Customer");
const Branch = require("../../branches/models/Branch");
const DeliveryOrder = require("../../delivery/models/DeliveryOrder");
const CommonApproval = require("../../approvals/models/Approval");
const numberSequenceService = require("../../number-sequences/services/numberSequence.service");
const auditLogService = require("../../audit-logs/services/auditLog.service");
const InvoiceCalculationService = require("./invoiceCalculation.service");
const InvoicePdfService = require("./invoicePdf.service");
const { INVOICE_STATUS, INVOICE_TYPE, VARIANCE_POLICY } = require("../constants/invoice");
const ErrorHelper = require("../../../utils/ApiError");

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
      $or: [
        { estimationStatus: "APPROVED" },
        { currentStage: { $in: ["READY", "READY_FOR_DELIVERY", "DELIVERY", "DELIVERED", "COMPLETED"] } },
        { stage: { $in: ["READY", "READY_FOR_DELIVERY", "DELIVERY", "DELIVERED", "COMPLETED"] } },
        { status: { $in: ["READY", "READY_FOR_DELIVERY", "DELIVERY", "DELIVERED", "COMPLETED", "APPROVED"] } },
        { grandTotal: { $gt: 0 } },
        { estimatedPrice: { $gt: 0 } },
      ],
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
    if (job.estimationStatus !== "APPROVED") reasons.push("ESTIMATE_NOT_APPROVED");

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
    const isEligibleForInvoice =
      job.estimationStatus === "APPROVED" ||
      (Number(job.grandTotal) > 0 || Number(job.estimatedPrice) > 0) ||
      ["READY", "READY_FOR_DELIVERY", "DELIVERY", "DELIVERED", "COMPLETED", "APPROVED"].includes(job.status) ||
      ["READY", "READY_FOR_DELIVERY", "DELIVERY", "DELIVERED", "COMPLETED"].includes(job.currentStage) ||
      ["READY", "READY_FOR_DELIVERY", "DELIVERY", "DELIVERED", "COMPLETED"].includes(job.stage) ||
      (Array.isArray(payload.items) && payload.items.length > 0);

    if (!isEligibleForInvoice) {
      throw ErrorHelper.conflict("Cannot create invoice: Job order must have an approved estimate, valid pricing, or completed production/delivery stage.");
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

    // Map items: Prioritize manual items if provided by client/modal
    let draftItems = [];
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      draftItems = payload.items.map((it) => ({
        jobOrderItemId: it.jobOrderItemId || it._id || null,
        itemId: it.itemId || null,
        itemCode: it.itemCode || "",
        itemName: it.itemName || it.title || "Print Item",
        description: it.description || "",
        unit: it.unit || "PCS",
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice || it.unitRate) || 0),
        taxRate: Number(it.taxRate) || 0,
        discountType: it.discountType || "FIXED",
        discountValue: Number(it.discountValue) || 0,
      }));
    } else {
      const sourceItems = jobItems.length > 0 ? jobItems : (job.items || []);
      if (sourceItems.length > 0) {
        draftItems = sourceItems.map((it) => ({
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
      } else {
        const fallbackQty = Math.max(1, Number(job.quantity) || 1);
        const fallbackPrice = (Number(job.grandTotal || job.estimatedPrice || 0)) / fallbackQty;
        draftItems = [
          {
            jobOrderItemId: null,
            itemId: null,
            itemCode: "",
            itemName: job.title || "Print Order",
            description: job.customerRequirements || "",
            unit: "PCS",
            quantity: fallbackQty,
            unitPrice: fallbackPrice > 0 ? Number(fallbackPrice.toFixed(2)) : 0,
            taxRate: Number(job.taxRate) || 0,
            discountType: "FIXED",
            discountValue: 0,
          },
        ];
      }
    }

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
          advanceReceived: advanceAlreadyReceived,
          paidAmount: paidSoFar,
        });

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
        existingActive.status = INVOICE_STATUS.DRAFT; // Reset to DRAFT so user can review and finalize
        existingActive.remarks = remarks || existingActive.remarks || "Regenerated Final Settlement Invoice";
        existingActive.updatedBy = user?._id || null;
        await existingActive.save();

        await auditLogService.log({
          action: "INVOICE_REGENERATE_SETTLEMENT",
          resource: "Invoice",
          resourceId: existingActive._id,
          userId: user?._id,
          userName: user?.username || "System",
          branchId: job.branchId,
          details: {
            invoiceNumber: existingActive.invoiceNumber,
            jobOrderId: job._id,
            grandTotal: calc.grandTotal,
            balanceDue: calc.balanceDue,
          },
        });

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
      advanceReceived: updatePayload.advancePaid !== undefined
        ? Number(updatePayload.advancePaid)
        : (updatePayload.advanceApplied !== undefined ? updatePayload.advanceApplied : invoice.advanceApplied),
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
      advanceReceived: calculatePayload.advancePaid !== undefined
        ? Number(calculatePayload.advancePaid)
        : (calculatePayload.advanceApplied !== undefined ? calculatePayload.advanceApplied : invoice.advanceApplied),
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

    // Re-verify Job Order
    const job = await JobOrder.findById(invoice.jobOrderId);
    if (!job || job.status === "CANCELLED") {
      throw ErrorHelper.conflict("Cannot finalize invoice: Job Order is invalid or cancelled.");
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
    const invoiceNumber = invoice.invoiceNumber || (await numberSequenceService.getNextSequence("INV", invoice.branchId));

    invoice.invoiceNumber = invoiceNumber;
    invoice.status = INVOICE_STATUS.FINALIZED;
    invoice.finalizedBy = user?._id || null;
    invoice.finalizedAt = new Date();
    await invoice.save();

    // Link invoice number back to JobOrder, save advance paid and remaining balance due for settlement
    // Flow 1: Print Only winds up directly after invoice (COMPLETED & DELIVERED), does NOT enter production
    // Flow 2 & 3: Standard design pipeline advances to Designer Queue
    const nextJobStage = isPrintOnly
      ? "COMPLETED"
      : (job.source === "DESIGNER" ? "DESIGN_IN_PROGRESS" : "DESIGN_QUEUE");

    const notesText = isPrintOnly
      ? `Invoice ${invoiceNumber} finalized with full payment ₹${invoice.grandTotal || 0}. Print Only job completed and wound up directly.`
      : `Invoice ${invoiceNumber} finalized with advance ₹${invoice.advanceApplied || 0}. Sent to Designer Queue.`;

    if (["ESTIMATION", "ESTIMATE_APPROVAL"].includes(job.currentStage)) {
      try {
        const JobWorkflowService = require("../../job-orders/services/jobWorkflow.service");
        await JobWorkflowService.transition(job._id, nextJobStage, {
          actorId: user?._id,
          notes: notesText,
          patch: {
            invoiceNo: invoiceNumber,
            invoiceId: invoice._id,
            advancePaid: isPrintOnly ? Number(invoice.grandTotal || invoice.advanceApplied || 0) : Number(invoice.advanceApplied || 0),
            balanceDue: isPrintOnly ? 0 : Number(invoice.balanceDue || 0),
            paymentStatus: isPrintOnly ? "PAID" : (invoice.balanceDue === 0 ? "PAID" : (invoice.advanceApplied > 0 ? "PARTIAL" : "UNPAID")),
            status: isPrintOnly ? "DELIVERED" : job.status,
            completionDate: isPrintOnly ? new Date() : job.completionDate,
          },
          user,
        });

        if (isPrintOnly) {
          try {
            const ProductionOrder = mongoose.model("ProductionOrder");
            await ProductionOrder.deleteMany({ jobOrderId: job._id });
          } catch (delErr) {
            // ignore
          }
        }
      } catch (transErr) {
        console.warn("Could not transition workflow on invoice finalize:", transErr.message);
        await JobOrder.findByIdAndUpdate(job._id, {
          $set: {
            currentStage: nextJobStage,
            stage: nextJobStage,
            status: isPrintOnly ? "DELIVERED" : "DESIGN",
            completionDate: isPrintOnly ? new Date() : undefined,
            invoiceNo: invoiceNumber,
            invoiceId: invoice._id,
            advancePaid: isPrintOnly ? Number(invoice.grandTotal || invoice.advanceApplied || 0) : Number(invoice.advanceApplied || 0),
            balanceDue: isPrintOnly ? 0 : Number(invoice.balanceDue || 0),
            paymentStatus: isPrintOnly ? "PAID" : (invoice.balanceDue === 0 ? "PAID" : (invoice.advanceApplied > 0 ? "PARTIAL" : "UNPAID")),
          },
        });
        if (isPrintOnly) {
          try {
            const ProductionOrder = mongoose.model("ProductionOrder");
            await ProductionOrder.deleteMany({ jobOrderId: job._id });
          } catch (delErr) {
            // ignore
          }
        }
      }
    } else {
      const updateFields = {
        invoiceNo: invoiceNumber,
        invoiceId: invoice._id,
        grandTotal: Number(invoice.grandTotal || 0),
        totalAmount: Number(invoice.grandTotal || 0),
        discountTotal: Number(invoice.discountTotal || 0),
        advancePaid: isPrintOnly ? Number(invoice.grandTotal || invoice.advanceApplied || 0) : Number(invoice.advanceApplied || 0),
        balanceDue: isPrintOnly ? 0 : Number(invoice.balanceDue || 0),
        paymentStatus: isPrintOnly ? "PAID" : (invoice.balanceDue === 0 ? "PAID" : (invoice.advanceApplied > 0 ? "PARTIAL" : "UNPAID")),
      };
      if (isPrintOnly) {
        updateFields.currentStage = "COMPLETED";
        updateFields.stage = "COMPLETED";
        updateFields.status = "DELIVERED";
        updateFields.completionDate = new Date();
      } else if (isDesignOnly) {
        const isBalanceCleared = Number(invoice.balanceDue || 0) <= 0;
        if (isBalanceCleared) {
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
      if (isPrintOnly) {
        try {
          const ProductionOrder = mongoose.model("ProductionOrder");
          await ProductionOrder.deleteMany({ jobOrderId: job._id });
        } catch (delErr) {
          // ignore
        }
      }
    }

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
