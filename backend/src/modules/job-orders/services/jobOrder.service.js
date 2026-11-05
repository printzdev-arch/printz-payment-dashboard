const jobOrderRepository = require("../models/JobOrder");
const jobItemRepository = require("../models/JobItem");
const jobWorkflowEventRepository = require("../models/JobWorkflowEvent");
const jobApprovalRepository = require("../models/JobApproval");
const jobFileRepository = require("../models/JobFile");
const JobAssignment = require("../../design/models/JobAssignment");
const JobSample = require("../../design/models/JobSample");
const JobWorkflowService = require("./jobWorkflow.service");
const JobEstimateService = require("./jobEstimate.service");
const ProductionStateService = require("../../production/services/productionState.service");
const { PRE_PRODUCTION_STATUSES, JOB_STAGES } = require("../constants/jobStages");
const { sortFinishingServices, ensureStaticFinishingServices } = require("../constants/finishingServices");
const { getFlowType, FLOW_TYPES } = require("../constants/jobFlows");
const { emitJobEvent } = require("../events/jobEvents.emitter");
const ErrorHelper = require("../../../utils/ApiError");
const customerRepository = require("../../customers/models/Customer");
const CustomerMatchingService = require("../../customers/services/customerMatching.service");
const mongoose = require("mongoose");
const { getDatePrefix, getTodayDateString, parseBusinessDate, startOfISTDay, endOfISTDay } = require("../../../utils/dateUtils");

class JobOrderService {
  /**
   * Scope filter helper: ALL / BRANCH / ASSIGNED
   */
  static async scopeFilter(user, perm = "job.order.view") {
    if (!user) return {};
    if (user.role === "admin") return {};

    const perms = user.permissions || {};
    const scope = perms[perm] || (user.role === "manager" ? "BRANCH" : "ASSIGNED");

    if (scope === "ALL") return {};
    if (scope === "BRANCH") {
      return user.branchId ? { branchId: user.branchId } : {};
    }

    // ASSIGNED scope
    const me = user._id;
    return {
      $or: [{ designerId: me }, { createdBy: me }],
    };
  }

  static validateHeader(dto = {}) {
    if (dto.quantity !== undefined && Number(dto.quantity) <= 0) {
      throw ErrorHelper.badRequest("Quantity must be greater than 0.");
    }
    const orderDate = dto.orderDate;
    const dueDate = dto.dueDate || dto.expectedDeliveryDate;
    if (orderDate && dueDate && new Date(dueDate) < new Date(orderDate)) {
      throw ErrorHelper.badRequest("Due date must be on or after order date.");
    }
  }

  static allowedActions(job) {
    if (!job) return [];
    if (["CANCELLED", "DELIVERED"].includes(job.status)) return [];
    if (job.status === "ON_HOLD") return ["resume", "cancel"];

    const actions = ["hold", "cancel"];
    switch (job.currentStage) {
      case "ENQUIRY":
      case "ESTIMATION":
        if (this.isEditable(job)) actions.push("update", "replaceItems");
        actions.push("estimate");
        break;
      case "ESTIMATE_APPROVAL":
        if (this.isEditable(job)) actions.push("update");
        actions.push("estimate", "estimate.approve", "estimate.reject");
        break;
      case "DESIGN_QUEUE":
        actions.push("assign");
        break;
      case "DESIGN_ASSIGNED":
        actions.push("accept", "reject", "reassign");
        break;
      case "DESIGN_IN_PROGRESS":
      case "REVISION":
        actions.push("upload-sample", "submit-sample", "reassign");
        break;
      case "SAMPLE_APPROVAL":
        actions.push("sample.decide");
        break;
      case "READY":
        actions.push("invoice");
        break;
    }
    return actions;
  }

  /**
   * Create new Job Order.
   */
  static async create(dto = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    this.validateHeader(dto);

    if (dto.idempotencyKey) {
      const existing = await jobOrderRepository.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const orderTitle = dto.jobTitle || dto.title || (Array.isArray(dto.items) && dto.items[0]?.itemName) || "Print Job";
    const customerPhone = dto.customerMobile || dto.customerPhone || "";
    const dueDate = dto.expectedDeliveryDate || dto.dueDate || null;

    const items = Array.isArray(dto.items) && dto.items.length > 0
      ? dto.items
      : [{ itemName: orderTitle, quantity: Number(dto.quantity) || 1, unitRate: 0 }];

    const totals = JobEstimateService.calculateTotals(items, dto.discountAmount || 0);
    JobEstimateService.assertDiscountAllowed(totals.subtotal, totals.discount, user);

    const datePrefix = getDatePrefix();
    const countJobs = await jobOrderRepository.countDocuments();
    const jobNo = `JOB-${datePrefix}-${String(countJobs + 1).padStart(4, "0")}`;

    let customerId = null;
    let customerSnapshot = {
      name: dto.customerName || dto.customerSnapshot?.name || "Walk-in Customer",
      mobile: customerPhone || dto.customerSnapshot?.mobile || "",
      email: dto.customerEmail || dto.customerSnapshot?.email || "",
      company: dto.customerCompany || dto.customerSnapshot?.company || "",
      address: dto.customerAddress || dto.customerSnapshot?.address || "",
      gstin: dto.customerGstin || dto.customerSnapshot?.gstin || "",
    };

    // Branch managers can only raise job orders for their own branch, whatever the client sends
    const isBranchManager = ["manager", "branch_manager", "branch_manager1"].includes(
      String(user.role || user.roleCode || "").toLowerCase()
    );
    const orderBranchId = isBranchManager && user.branchId ? user.branchId : dto.branchId || user.branchId;

    if (dto.customerId) {
      if (!mongoose.Types.ObjectId.isValid(String(dto.customerId))) {
        throw ErrorHelper.badRequest(`Invalid customer ID format: '${dto.customerId}'`);
      }
      const customer = await customerRepository.findById(dto.customerId);
      if (!customer) {
        throw ErrorHelper.notFound(`Customer with ID '${dto.customerId}' not found`);
      }
      if (customer.isActive === false) {
        throw ErrorHelper.badRequest(`Customer '${customer.name}' is inactive and cannot be assigned to new job orders`);
      }
      customerId = customer._id;
      customerSnapshot = {
        name: dto.customerName || dto.customerSnapshot?.name || customer.name || "Walk-in Customer",
        mobile: customerPhone || dto.customerSnapshot?.mobile || customer.mobile || "",
        email: dto.customerEmail || dto.customerSnapshot?.email || customer.email || "",
        company: dto.customerCompany || dto.customerSnapshot?.company || customer.companyName || customer.company || "",
        address: dto.customerAddress || dto.customerSnapshot?.address || customer.address || "",
        gstin: dto.customerGstin || dto.customerSnapshot?.gstin || customer.gstin || "",
      };

      // Record branch visit if order is placed at this branch
      if (orderBranchId) {
        await customerRepository.addVisitedBranch(customerId, orderBranchId).catch(() => {});
      }
    } else if (customerPhone) {
      // Fallback matching: match existing customer by phone before creating a new one
      const matchResult = await CustomerMatchingService.matchOrCreateCustomer(
        {
          name: dto.customerName || dto.customerSnapshot?.name || "Walk-in Customer",
          mobile: customerPhone,
          phone: customerPhone,
          email: dto.customerEmail,
          company: dto.customerCompany,
          address: dto.customerAddress,
          gstin: dto.customerGstin,
        },
        { branchId: orderBranchId }
      );
      customerId = matchResult.customer._id;
      customerSnapshot = {
        name: matchResult.customer.name,
        mobile: matchResult.customer.mobile,
        email: matchResult.customer.email || "",
        company: matchResult.customer.companyName || matchResult.customer.company || "",
        address: matchResult.customer.address || "",
        gstin: matchResult.customer.gstin || "",
      };
    }

    const userRoleStr = String(user.role || user.roleCode || "").toLowerCase();
    const isDesigner = userRoleStr === "designer";
    const orderSource = isDesigner ? "DESIGNER" : "MANAGER";
    const orderCreatedByRole = isDesigner ? "DESIGNER" : (user.role || "MANAGER").toUpperCase();

    const finishingTotal = (Array.isArray(dto.finishingServices) ? dto.finishingServices : []).reduce(
      (sum, f) => sum + Number(f.total || (Number(f.unitPrice || 0) * Number(f.quantity || dto.quantity || 1))),
      0
    );
    // Finishing is only added on top when the items don't already carry it as their own lines,
    // otherwise it would be counted twice.
    const finishingInItems = items.some(
      (it) => it.itemType === "FINISHING" || String(it.itemName || "").toLowerCase().startsWith("finishing")
    );
    const extraFinishing = finishingInItems ? 0 : Math.round(finishingTotal * 100) / 100;
    const computedSubtotal = Math.round((totals.subtotal + extraFinishing) * 100) / 100;
    const computedGrandTotal = Math.round((totals.grandTotal + extraFinishing) * 100) / 100;
    // The server total is authoritative; client totals are used only when no priced items were sent
    const finalGrandTotal =
      computedGrandTotal > 0
        ? computedGrandTotal
        : Math.max(Number(dto.grandTotal || 0), Number(dto.totalAmount || 0), Number(dto.estimatedPrice || 0));

    const job = await jobOrderRepository.create({
      jobNo,
      branchId: orderBranchId,
      customerId,
      customerSnapshot,
      customerName: customerSnapshot.name,
      customerPhone: customerSnapshot.mobile || customerPhone,
      customerEmail: dto.customerEmail || customerSnapshot.email || "",
      branchName: dto.branchName || "",
      title: orderTitle,
      orderDate: dto.orderDate ? (parseBusinessDate(dto.orderDate) || new Date()) : new Date(),
      dueDate: dueDate ? (parseBusinessDate(dueDate) || new Date(dueDate)) : null,
      // Two priorities: NORMAL and URGENT (HIGH / RUSH count as urgent)
      priority: ["URGENT", "HIGH", "RUSH"].includes(String(dto.priority || "").toUpperCase()) ? "URGENT" : "NORMAL",
      jobType: dto.jobType || "PRINT_JOB",
      // Finishing lines are not extra pieces: when no job quantity is sent, count only the product lines
      quantity:
        Number(dto.quantity) ||
        items
          .filter((i) => i.itemType !== "FINISHING")
          .reduce((acc, i) => acc + (Number(i.quantity) || 0), 0) ||
        1,
      customerRequirements: dto.customerRequirements || dto.notes || "",
      remarks: dto.remarks || dto.notes || "",
      notes: dto.notes || dto.remarks || "",
      specialInstructions: dto.specialInstructions || "",
      deliveryMethod: dto.deliveryMethod || "",
      qcRequired: getFlowType({ jobType: dto.jobType || "PRINT_JOB" }) === FLOW_TYPES.PRINT_ONLY ? dto.qcRequired !== false : true,
      specs: typeof dto.specs === "object" && dto.specs !== null ? dto.specs : {},
      finishingServices: Array.isArray(dto.finishingServices) ? dto.finishingServices : [],
      additionalServices: Array.isArray(dto.additionalServices) ? dto.additionalServices : [],
      attachments: Array.isArray(dto.attachments) ? dto.attachments : [],
      advancePaid: Number(dto.advancePaid) || 0,
      paidAmount: Number(dto.advancePaid) || 0,
      balanceDue: Math.max(0, finalGrandTotal - (Number(dto.advancePaid) || 0)),
      status: dto.status === "SUBMITTED" ? "ACTIVE" : (dto.status || "DRAFT"),
      currentStage: "ENQUIRY",
      stage: "ENQUIRY",
      designStatus: isDesigner ? "ASSIGNED" : "UNASSIGNED",
      designerId: isDesigner ? user._id : (dto.designerId || null),
      designerName: isDesigner ? (user.name || "Designer") : (dto.designerName || ""),
      subtotal: computedSubtotal > 0 ? computedSubtotal : Number(dto.subtotal) || 0,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discount,
      grandTotal: finalGrandTotal,
      estimatedPrice: finalGrandTotal,
      totalAmount: finalGrandTotal,
      source: orderSource,
      createdByRole: orderCreatedByRole,
      createdBy: user._id,
      idempotencyKey: dto.idempotencyKey || null,
    });

    if (isDesigner) {
      try {
        await JobAssignment.create({
          jobOrderId: job._id,
          employeeId: user._id,
          assignmentType: "DESIGNER",
          method: "MANUAL",
          status: "ACTIVE",
          currentAssignment: true,
          assignedAt: new Date(),
          acceptedAt: new Date(),
          assignedBy: user._id,
        });
      } catch (assignErr) {
        console.warn("Could not auto-create assignment for designer order:", assignErr.message);
      }
    }

    // Create item records
    const itemDocsToCreate = this.buildItemDocs(job._id, items, totals);

    await jobItemRepository.insertMany(itemDocsToCreate);
    job.items = itemDocsToCreate;
    await job.save();

    // Record creation in workflow & audit
    await JobWorkflowService.recordCreated(job, user._id);

    if (!dto.draft) {
      await JobWorkflowService.transition(job._id, "ESTIMATION", { actorId: user._id, user });
      if (dto.submitForEstimateApproval) {
        await JobEstimateService.estimate(job._id, { items }, user);
      }
    }

    emitJobEvent("job.created", { jobId: String(job._id), jobNo });

    return this.get(job._id, user);
  }

  /**
   * Build the job item records for a list of order lines (shared by create and edit).
   */
  static buildItemDocs(jobId, items, totals) {
    return items.map((it, idx) => ({
      jobOrderId: jobId,
      lineNo: idx + 1,
      jobItemId: it.jobItemId || it.id || `item_${jobId}_${idx + 1}`,
      productType: it.productType || it.specifications?.productType || it.itemType || "PRINT",
      itemType: it.itemType || "PRINT",
      itemId: it.itemId || null,
      itemName: it.itemName || it.title || it.name || it.description || "Print Item",
      description: it.description || it.itemName || it.name || "",
      quantity: Number(it.quantity || it.qty) || 1,
      unit: it.unit || "PCS",
      unitRate: Number(it.unitRate || it.unitPrice || it.rate) || 0,
      unitPrice: Number(it.unitRate || it.unitPrice || it.rate) || 0,
      taxRate: Number(it.taxRate) || 0,
      amount: totals.amounts[idx] || (Number(it.quantity || 1) * Number(it.unitRate || it.unitPrice || 0)),
      totalPrice: totals.amounts[idx] || (Number(it.quantity || 1) * Number(it.unitRate || it.unitPrice || 0)),
      needsProduction: it.needsProduction !== false,
      designRequired: it.designRequired !== undefined ? it.designRequired : false,
      designNotes: it.designNotes || "",
      size: it.size || null,
      printing: it.printing || null,
      material: it.material || null,
      notes: it.notes || "",
      specifications: it.specifications || it.specs || {},
      paperType: it.paperType || it.material?.paperType || it.specifications?.paperType || "",
      paperSize: it.paperSize || it.material?.paperSize || it.specifications?.size || "",
      paperGsm: it.paperGsm || it.specifications?.paperGsm || "",
      printingType: it.printingType || "",
      colorMode: it.colorMode || it.printing?.colourMode || it.specifications?.color || "",
      sides: it.sides || it.printing?.side || it.specifications?.printingSide || "SINGLE",
      printingSide: it.printingSide || it.specifications?.printingSide || it.sides || "SINGLE",
      lamination: it.lamination || it.specifications?.lamination || "",
      finishing: Array.isArray(it.finishing)
        ? it.finishing.map((f, i) => {
            if (typeof f === "string") return { code: f, name: f, config: "", quantity: 0, unitPrice: 0, notes: "", sequence: i + 1 };
            const code = f.code || f.process || f.operationCode || f.name || "FINISHING";
            const name = f.name || f.option || f.process || code;
            const config = f.config || "";
            const quantity = Number(f.quantity) || 0;
            const unitPrice = Number(f.unitPrice) || 0;
            const notes = f.notes || (f.config ? `Config: ${f.config}` : f.option ? `Option: ${f.option}` : "");
            const sequence = f.sequence || i + 1;
            return { code, name, config, quantity, unitPrice, notes, sequence };
          })
        : [],
      materials: Array.isArray(it.materials)
        ? it.materials.map((m) => {
            if (typeof m === "string") return { itemName: m, quantity: 1, unit: "PCS" };
            return {
              itemId: m.itemId || null,
              itemName: m.itemName || "",
              quantity: Number(m.quantity) || 0,
              unit: m.unit || "",
            };
          })
        : [],
      specification: it.specification || "",
      estimatedCost: Number(it.estimatedCost) || 0,
      estimatedPrice: Number(it.estimatedPrice) || 0,
      productionQty: Number(it.productionQty) || Number(it.quantity) || 1,
      customerRequirements: it.customerRequirements || it.notes || "",
      remarks: it.remarks || "",
    }));
  }

  /**
   * A job order can be edited only until its estimate is approved.
   */
  static isEditable(job) {
    if (!job) return false;
    if (job.isLocked || job.closureStatus === "CLOSED") return false;
    if (["CANCELLED", "ON_HOLD"].includes(job.status)) return false;
    if (job.estimationStatus === "APPROVED") return false;
    return [JOB_STAGES.ENQUIRY, JOB_STAGES.ESTIMATION, JOB_STAGES.ESTIMATE_APPROVAL].includes(
      job.currentStage || job.stage
    );
  }

  /**
   * Branch managers may only touch job orders of their own branch.
   */
  static assertBranchAccess(job, user) {
    const role = String(user?.role || user?.roleCode || "").toLowerCase();
    if (!["manager", "branch_manager", "branch_manager1"].includes(role) || !user.branchId) return;
    const own = String(user.branchId._id || user.branchId);
    const jobBranch = String(job.branchId?._id || job.branchId || "");
    if (jobBranch && jobBranch !== own) {
      throw ErrorHelper.forbidden("You can only modify job orders of your own branch.");
    }
  }

  /**
   * Update a Job Order before its estimate is approved.
   * Only the listed fields can be changed; stage, status, totals and branch are never taken from the request.
   */
  static async update(id, dto = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    this.validateHeader(dto);

    const job = await jobOrderRepository.findById(id);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${id}`);

    this.assertBranchAccess(job, user);

    if (job.isLocked || job.closureStatus === "CLOSED") {
      throw ErrorHelper.forbidden("Cannot modify a closed or locked Job Order.");
    }
    if (!this.isEditable(job)) {
      throw ErrorHelper.conflict(
        job.estimationStatus === "APPROVED"
          ? "This job order can no longer be edited because its estimate has been approved."
          : `This job order can no longer be edited at stage '${job.currentStage}'.`
      );
    }

    const set = {};
    const copy = ["branchName", "deliveryMethod", "remarks", "notes", "specialInstructions", "jobType", "specs", "additionalServices", "attachments"];
    for (const key of copy) {
      if (dto[key] !== undefined) set[key] = dto[key];
    }
    // Quality control can be switched off only for Print Only jobs
    if (dto.qcRequired !== undefined || set.jobType !== undefined) {
      const nextType = set.jobType !== undefined ? set.jobType : job.jobType;
      const requested = dto.qcRequired !== undefined ? dto.qcRequired !== false : job.qcRequired !== false;
      set.qcRequired = getFlowType({ jobType: nextType }) === FLOW_TYPES.PRINT_ONLY ? requested : true;
    }
    if (dto.title !== undefined || dto.jobTitle !== undefined) set.title = dto.title || dto.jobTitle;
    if (dto.dueDate !== undefined) set.dueDate = dto.dueDate ? parseBusinessDate(dto.dueDate) || new Date(dto.dueDate) : null;
    if (dto.priority !== undefined) {
      set.priority = ["URGENT", "HIGH", "RUSH"].includes(String(dto.priority || "").toUpperCase()) ? "URGENT" : "NORMAL";
    }
    if (dto.quantity !== undefined) set.quantity = Number(dto.quantity);
    if (dto.finishingServices !== undefined) {
      set.finishingServices = Array.isArray(dto.finishingServices) ? dto.finishingServices : [];
    }
    if (dto.remarks !== undefined && dto.notes === undefined) set.notes = dto.remarks;
    if (dto.notes !== undefined && dto.remarks === undefined) set.remarks = dto.notes;

    // The customer of an existing job order is fixed; the same customer may be sent back unchanged
    if (dto.customerId !== undefined && String(dto.customerId || "") !== String(job.customerId || "")) {
      throw ErrorHelper.badRequest("The customer of a job order cannot be changed.");
    }

    let itemsReplaced = false;
    if (Array.isArray(dto.items) && dto.items.length > 0) {
      const items = dto.items;
      const discount = dto.discountAmount !== undefined ? dto.discountAmount : job.discountAmount || 0;
      const totals = JobEstimateService.calculateTotals(items, discount);
      JobEstimateService.assertDiscountAllowed(totals.subtotal, totals.discount, user);

      const finishingList = set.finishingServices !== undefined ? set.finishingServices : job.finishingServices || [];
      const finishingInItems = items.some(
        (it) => it.itemType === "FINISHING" || String(it.itemName || "").toLowerCase().startsWith("finishing")
      );
      const extraFinishing = finishingInItems
        ? 0
        : finishingList.reduce(
            (sum, f) => sum + Number(f.total || Number(f.unitPrice || 0) * Number(f.quantity || set.quantity || job.quantity || 1)),
            0
          );
      const subtotal = Math.round((totals.subtotal + extraFinishing) * 100) / 100;
      const grandTotal = Math.round((totals.grandTotal + extraFinishing) * 100) / 100;

      const itemDocs = this.buildItemDocs(job._id, items, totals);
      await jobItemRepository.deleteMany({ jobOrderId: job._id });
      await jobItemRepository.insertMany(itemDocs);

      set.items = itemDocs;
      set.subtotal = subtotal;
      set.taxAmount = totals.taxAmount;
      set.discountAmount = totals.discount;
      set.grandTotal = grandTotal;
      set.totalAmount = grandTotal;
      set.estimatedPrice = grandTotal;
      set.balanceDue = Math.max(0, grandTotal - (Number(job.advancePaid) || 0));
      if (set.quantity === undefined) {
        set.quantity = items.filter((i) => i.itemType !== "FINISHING").reduce((acc, i) => acc + (Number(i.quantity) || 0), 0) || job.quantity;
      }
      itemsReplaced = true;
    }

    await jobOrderRepository.update(job._id, set);

    // An estimate already sent for approval must follow the edited order, so it is submitted again as a new version
    if (itemsReplaced && (job.estimationStatus === "PENDING" || job.currentStage === JOB_STAGES.ESTIMATE_APPROVAL)) {
      try {
        await JobEstimateService.estimate(job._id, { items: dto.items }, user);
      } catch (estimateErr) {
        console.warn("Could not refresh estimate after job order edit:", estimateErr.message);
      }
    }

    await ProductionStateService.logAudit({
      action: "UPDATE",
      resource: "JobOrder",
      resourceId: job._id,
      user,
      branchId: job.branchId,
      details: { fields: Object.keys(set), itemsReplaced },
    });

    return this.get(job._id, user);
  }

  /**
   * Replace items in pre-production.
   */
  static async replaceItems(id, dto = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(id);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${id}`);

    if (job.isLocked || job.closureStatus === "CLOSED") {
      throw ErrorHelper.forbidden("Cannot modify items on a closed or locked Job Order.");
    }

    if (!PRE_PRODUCTION_STATUSES.includes(job.status)) {
      throw ErrorHelper.conflict("Job items are locked once production has started.");
    }

    const items = Array.isArray(dto.items) ? dto.items : [];
    const totals = JobEstimateService.calculateTotals(
      items,
      dto.discountAmount !== undefined ? dto.discountAmount : job.discountAmount
    );

    JobEstimateService.assertDiscountAllowed(totals.subtotal, totals.discount, user);

    await jobItemRepository.deleteMany({ jobOrderId: job._id });

    const itemDocsToCreate = items.map((it, idx) => ({
      jobOrderId: job._id,
      lineNo: idx + 1,
      itemType: it.itemType || "PRINT",
      itemId: it.itemId || null,
      itemName: it.itemName || it.description || "Print Item",
      description: it.description || it.itemName || "",
      quantity: Number(it.quantity) || 1,
      unit: it.unit || "PCS",
      unitRate: Number(it.unitRate || it.unitPrice) || 0,
      unitPrice: Number(it.unitRate || it.unitPrice) || 0,
      taxRate: Number(it.taxRate) || 0,
      amount: totals.amounts[idx] || (Number(it.quantity) * Number(it.unitRate || 0)),
      totalPrice: totals.amounts[idx] || (Number(it.quantity) * Number(it.unitRate || 0)),
      needsProduction: it.needsProduction !== false,
      paperType: it.paperType || "",
      paperSize: it.paperSize || "",
      printingType: it.printingType || "",
      colorMode: it.colorMode || "",
      sides: it.sides || "SINGLE",
      finishing: Array.isArray(it.finishing)
        ? it.finishing.map((f, i) => {
            if (typeof f === "string") return { code: f, name: f, sequence: i + 1 };
            const code = f.code || f.process || f.operationCode || "FINISHING";
            const name = f.name || f.option || f.process || code;
            const notes = f.notes || (f.option ? `Option: ${f.option}` : "");
            const sequence = f.sequence || i + 1;
            return { code, name, notes, sequence };
          })
        : [],
      materials: Array.isArray(it.materials)
        ? it.materials.map((m) => {
            if (typeof m === "string") return { itemName: m, quantity: 1, unit: "PCS" };
            return {
              itemId: m.itemId || null,
              itemName: m.itemName || "",
              quantity: Number(m.quantity) || 0,
              unit: m.unit || "",
            };
          })
        : [],
      specification: it.specification || "",
      estimatedCost: Number(it.estimatedCost) || 0,
      estimatedPrice: Number(it.estimatedPrice) || 0,
      productionQty: Number(it.productionQty) || Number(it.quantity) || 1,
      customerRequirements: it.customerRequirements || "",
      remarks: it.remarks || "",
    }));

    await jobItemRepository.insertMany(itemDocsToCreate);
    job.items = itemDocsToCreate;
    await job.save();

    job.subtotal = totals.subtotal;
    job.taxAmount = totals.taxAmount;
    job.discountAmount = totals.discount;
    job.grandTotal = totals.grandTotal;
    job.totalAmount = totals.grandTotal;
    job.estimatedPrice = totals.grandTotal;
    await job.save();

    await ProductionStateService.logAudit({
      action: "UPDATE",
      resource: "JobOrderItems",
      resourceId: job._id,
      user,
      branchId: job.branchId,
      details: { itemsCount: items.length, totals },
    });

    return jobItemRepository.findByJobOrderId(job._id);
  }

  static async hold(id, reason, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    return JobWorkflowService.hold(id, reason, user._id);
  }

  static async resume(id, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    return JobWorkflowService.resume(id, user._id);
  }

  static async cancel(id, reason, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    return JobWorkflowService.cancel(id, reason, user._id);
  }

  /**
   * List jobs with rich filters and scope enforcement.
   */
  static async list(query = {}, user) {
    const scope = await this.scopeFilter(user);
    const filter = { ...scope };

    if (query.source) {
      const srcUpper = String(query.source).toUpperCase();
      if (srcUpper === "MANAGER") {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [{ source: "MANAGER" }, { source: { $exists: false } }, { source: null }],
        });
      } else if (srcUpper === "DESIGNER") {
        filter.source = "DESIGNER";
      } else {
        filter.source = srcUpper;
      }
    }

    if (query.branchId) filter.branchId = query.branchId;
    if (query.customerId) {
      const custIdStr = String(query.customerId).trim();
      if (mongoose.Types.ObjectId.isValid(custIdStr)) {
        filter.customerId = { $in: [new mongoose.Types.ObjectId(custIdStr), custIdStr] };
      } else {
        filter.customerId = custIdStr;
      }
    }
    if (query.designerId) filter.designerId = query.designerId;
    if (query.jobType) filter.jobType = query.jobType;
    if (query.priority) filter.priority = query.priority;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

    if (query.status) {
      const statuses = query.status.split(",").map((s) => s.trim()).filter(Boolean);
      filter.status = { $in: statuses };
    }

    if (query.currentStage) {
      const stages = query.currentStage.split(",").map((s) => s.trim()).filter(Boolean);
      filter.currentStage = { $in: stages };
    }

    if (query.from || query.to) {
      filter.orderDate = {};
      if (query.from) filter.orderDate.$gte = startOfISTDay(query.from);
      if (query.to) filter.orderDate.$lte = endOfISTDay(query.to);
    }

    if (query.dueFrom || query.dueTo) {
      filter.dueDate = {};
      if (query.dueFrom) filter.dueDate.$gte = startOfISTDay(query.dueFrom);
      if (query.dueTo) filter.dueDate.$lte = endOfISTDay(query.dueTo);
    }

    if (query.overdue === "true") {
      filter.dueDate = { ...(filter.dueDate || {}), $lt: new Date() };
      filter.status = { ...(filter.status || {}), $nin: ["DELIVERED", "CANCELLED"] };
    }

    if (query.q || query.search) {
      const s = query.q || query.search;
      const regex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { jobNo: regex },
        { title: regex },
        { customerName: regex },
        { "customerSnapshot.name": regex },
        { "customerSnapshot.mobile": regex },
      ];
    }

    const result = await jobOrderRepository.findAll({
      ...filter,
      page: query.page,
      limit: query.limit,
    });

    return result;
  }

  /**
   * Get job order details by ID.
   */
  static async get(id, user = null) {
    const job = await jobOrderRepository.findById(id);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${id}`);

    const [items, currentAssignment, latestSample, files] = await Promise.all([
      jobItemRepository.findByJobOrderId(job._id),
      JobAssignment.findOne({ jobOrderId: job._id, assignmentType: "DESIGNER", currentAssignment: true })
        .populate("employeeId", "name email role phone")
        .populate("assignedBy", "name email role"),
      JobSample.findOne({ jobOrderId: job._id }).sort({ versionNo: -1 }),
      jobFileRepository.findByJobOrderId(job._id),
    ]);

    const jobObj = job.toObject ? job.toObject() : { ...job };

    const jobTypeStr = String(jobObj.jobType || jobObj.specs?.jobType || "").toUpperCase();
    const isDesignOnly = jobTypeStr.includes("DESIGN") && !jobTypeStr.includes("PRINT");
    const isPrintOnly = jobTypeStr.includes("PRINT") && !jobTypeStr.includes("DESIGN");

    const hasCompletedDesign =
      jobObj.designStatus === "COMPLETED" ||
      ["PRODUCTION_PLANNING", "COMPLETED", "DELIVERED"].includes(jobObj.currentStage) ||
      ["PRODUCTION_PLANNING", "COMPLETED", "DELIVERED"].includes(jobObj.stage) ||
      ["COMPLETED", "DELIVERED"].includes(jobObj.status);

    if (isDesignOnly && hasCompletedDesign) {
      const isPaidInFull = (jobObj.balanceDue !== undefined && jobObj.balanceDue !== null && Number(jobObj.balanceDue) <= 0) || jobObj.paymentStatus === "PAID";
      const targetStage = isPaidInFull ? "COMPLETED" : "READY";
      const targetStatus = isPaidInFull ? "COMPLETED" : "READY";

      jobObj.currentStage = targetStage;
      jobObj.stage = targetStage;
      jobObj.status = targetStatus;
      jobObj.designStatus = "COMPLETED";

      jobOrderRepository.updateOne(
        { _id: job._id },
        {
          $set: {
            currentStage: targetStage,
            stage: targetStage,
            status: targetStatus,
            designStatus: "COMPLETED",
          },
        }
      ).catch(() => {});
    }

    if (Array.isArray(jobObj.finishingServices) && jobObj.finishingServices.length > 0) {
      jobObj.finishingServices = sortFinishingServices(jobObj.finishingServices);
    }
    return {
      ...jobObj,
      items,
      currentAssignment,
      latestSample,
      files,
      allowedActions: this.allowedActions(job),
      canEdit: this.isEditable(job),
    };
  }

  static async statusCounts(user, query = {}) {
    const match = await this.scopeFilter(user);
    if (query?.source) {
      const srcUpper = String(query.source).toUpperCase();
      if (srcUpper === "MANAGER") {
        match.$and = match.$and || [];
        match.$and.push({
          $or: [{ source: "MANAGER" }, { source: { $exists: false } }, { source: null }],
        });
      } else if (srcUpper === "DESIGNER") {
        match.source = "DESIGNER";
      }
    }
    const [byStatus, byStage] = await Promise.all([
      jobOrderRepository.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      jobOrderRepository.aggregate([
        { $match: match },
        { $group: { _id: "$currentStage", count: { $sum: 1 } } },
      ]),
    ]);

    const toMap = (arr) => Object.fromEntries(arr.map((r) => [r._id, r.count]));
    return {
      byStatus: toMap(byStatus),
      byStage: toMap(byStage),
    };
  }

  static async workflowEvents(id, user = null) {
    const job = await jobOrderRepository.findById(id);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${id}`);

    return jobWorkflowEventRepository.findByJobOrderId(job._id);
  }

  static async approvalHistory(id, user = null, approvalType = null) {
    const job = await jobOrderRepository.findById(id);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${id}`);

    return jobApprovalRepository.findByJobOrderId(job._id, approvalType);
  }

  static async hold(id, reason = "", user = null) {
    const JobWorkflowService = require("./jobWorkflow.service");
    return JobWorkflowService.hold(id, reason, user?._id);
  }

  static async resume(id, user = null) {
    const JobWorkflowService = require("./jobWorkflow.service");
    return JobWorkflowService.resume(id, user?._id);
  }

  static async cancel(id, reason = "", user = null) {
    const JobWorkflowService = require("./jobWorkflow.service");
    return JobWorkflowService.cancel(id, reason, user?._id);
  }
}

module.exports = JobOrderService;
