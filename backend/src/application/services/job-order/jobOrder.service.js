const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobItemRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobItemRepository");
const jobWorkflowEventRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobWorkflowEventRepository");
const jobApprovalRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobApprovalRepository");
const jobFileRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobFileRepository");
const JobAssignment = require("../../../infrastructure/database/mongoose/models/design/JobAssignment");
const JobSample = require("../../../infrastructure/database/mongoose/models/design/JobSample");
const JobWorkflowService = require("./jobWorkflow.service");
const JobEstimateService = require("./jobEstimate.service");
const ProductionStateService = require("../production/productionState.service");
const { PRE_PRODUCTION_STATUSES, JOB_STAGES } = require("../../../shared/constants/job-order/jobStages");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

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
    if (dto.orderDate && dto.dueDate && new Date(dto.dueDate) < new Date(dto.orderDate)) {
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
        actions.push("update", "replaceItems", "estimate");
        break;
      case "ESTIMATE_APPROVAL":
        actions.push("estimate", "estimate.approve", "estimate.reject");
        break;
      case "DESIGN_QUEUE":
        actions.push("assign", "skip-design");
        break;
      case "DESIGN_ASSIGNED":
        actions.push("accept", "reject", "reassign", "skip-design");
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

    const items = Array.isArray(dto.items) && dto.items.length > 0
      ? dto.items
      : [{ itemName: dto.title || "Print Job Item", quantity: Number(dto.quantity) || 1, unitRate: 0 }];

    const totals = JobEstimateService.calculateTotals(items, dto.discountAmount || 0);
    JobEstimateService.assertDiscountAllowed(totals.subtotal, totals.discount, user);

    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countJobs = await jobOrderRepository.countDocuments();
    const jobNo = `JO-${datePrefix}-${String(countJobs + 1).padStart(4, "0")}`;

    const job = await jobOrderRepository.create({
      jobNo,
      branchId: dto.branchId || user.branchId,
      customerId: dto.customerId || null,
      customerSnapshot: {
        name: dto.customerName || "Walk-in Customer",
        mobile: dto.customerPhone || "",
        email: dto.customerEmail || "",
        company: dto.customerCompany || "",
        address: dto.customerAddress || "",
        gstin: dto.customerGstin || "",
      },
      customerName: dto.customerName || "Walk-in Customer",
      customerPhone: dto.customerPhone || "",
      title: dto.title || items[0]?.itemName || "Print Job",
      orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      priority: dto.priority || "NORMAL",
      jobType: dto.jobType || "PRINT_JOB",
      quantity: Number(dto.quantity) || items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0) || 1,
      customerRequirements: dto.customerRequirements || "",
      remarks: dto.remarks || "",
      status: "DRAFT",
      currentStage: "ENQUIRY",
      stage: "ENQUIRY",
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discount,
      grandTotal: totals.grandTotal,
      estimatedPrice: totals.grandTotal,
      totalAmount: totals.grandTotal,
      createdBy: user._id,
    });

    // Create item records
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
        ? it.finishing.map((f, i) => (typeof f === "string" ? { code: f, name: f, sequence: i + 1 } : f))
        : [],
      materials: Array.isArray(it.materials)
        ? it.materials.map((m) => (typeof m === "string" ? { itemName: m } : m))
        : [],
      specification: it.specification || "",
      estimatedCost: Number(it.estimatedCost) || 0,
      estimatedPrice: Number(it.estimatedPrice) || 0,
      productionQty: Number(it.productionQty) || Number(it.quantity) || 1,
      customerRequirements: it.customerRequirements || "",
      remarks: it.remarks || "",
    }));

    await jobItemRepository.insertMany(itemDocsToCreate);

    // Record creation in workflow & audit
    await JobWorkflowService.recordCreated(job, user._id);

    if (!dto.draft) {
      await JobWorkflowService.transition(job._id, "ESTIMATION", { actorId: user._id, user });
      if (dto.submitForEstimateApproval) {
        await JobEstimateService.estimate(job._id, { items }, user);
      }
    }

    emitJobEvent("job.created", { jobId: String(job._id), jobNo });

    return jobOrderRepository.findById(job._id);
  }

  /**
   * Update Job Order header.
   */
  static async update(id, dto = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    this.validateHeader(dto);

    const job = await jobOrderRepository.findById(id);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${id}`);

    const isOpen = ["DRAFT", "ESTIMATION", "DESIGN"].includes(job.status);
    const keys = Object.keys(dto).filter((k) => dto[k] !== undefined);
    if (!isOpen && keys.some((k) => !["remarks", "dueDate", "notes"].includes(k))) {
      throw ErrorHelper.conflict("After design phase, only remarks, notes, and dueDate can be modified.");
    }

    const set = { ...dto };
    if (dto.dueDate) set.dueDate = new Date(dto.dueDate);
    if (dto.completionDate) set.completionDate = new Date(dto.completionDate);
    if (dto.quantity) set.quantity = Number(dto.quantity);

    const updated = await jobOrderRepository.update(job._id, set);

    await ProductionStateService.logAudit({
      action: "UPDATE",
      resource: "JobOrder",
      resourceId: job._id,
      user,
      branchId: job.branchId,
      details: dto,
    });

    return updated;
  }

  /**
   * Replace items in pre-production.
   */
  static async replaceItems(id, dto = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(id);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${id}`);

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
        ? it.finishing.map((f, i) => (typeof f === "string" ? { code: f, name: f, sequence: i + 1 } : f))
        : [],
      materials: Array.isArray(it.materials)
        ? it.materials.map((m) => (typeof m === "string" ? { itemName: m } : m))
        : [],
      specification: it.specification || "",
      estimatedCost: Number(it.estimatedCost) || 0,
      estimatedPrice: Number(it.estimatedPrice) || 0,
      productionQty: Number(it.productionQty) || Number(it.quantity) || 1,
      customerRequirements: it.customerRequirements || "",
      remarks: it.remarks || "",
    }));

    await jobItemRepository.insertMany(itemDocsToCreate);

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

  /**
   * Skip design from DESIGN_QUEUE or DESIGN_ASSIGNED directly to PRODUCTION_PLANNING.
   */
  static async skipDesign(id, reason = "Direct Print Ready file provided", user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(id);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${id}`);

    const countPrintReady = await jobFileRepository.countDocuments({
      jobOrderId: job._id,
      fileCategory: "PRINT_READY",
    });

    if (countPrintReady < 1) {
      throw ErrorHelper.unprocessableEntity(
        "PRINT_READY_FILE_REQUIRED: Please upload a PRINT_READY file before skipping design."
      );
    }

    // Close any active designer assignment
    await JobAssignment.updateMany(
      { jobOrderId: job._id, assignmentType: "DESIGNER", currentAssignment: true },
      { $set: { currentAssignment: false, status: "COMPLETED", releasedAt: new Date() } }
    );

    const updated = await JobWorkflowService.transition(job._id, "PRODUCTION_PLANNING", {
      actorId: user._id,
      reason: `DESIGN_SKIPPED: ${reason}`,
      patch: { designerId: null, assignedAt: null },
      user,
    });

    await ProductionStateService.logAudit({
      action: "UPDATE",
      resource: "JobOrder",
      resourceId: job._id,
      user,
      branchId: job.branchId,
      details: { skipDesign: true, reason },
    });

    return updated;
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

    if (query.branchId) filter.branchId = query.branchId;
    if (query.customerId) filter.customerId = query.customerId;
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
      if (query.from) filter.orderDate.$gte = new Date(query.from);
      if (query.to) filter.orderDate.$lte = new Date(query.to);
    }

    if (query.dueFrom || query.dueTo) {
      filter.dueDate = {};
      if (query.dueFrom) filter.dueDate.$gte = new Date(query.dueFrom);
      if (query.dueTo) filter.dueDate.$lte = new Date(query.dueTo);
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

    return jobOrderRepository.findAll({
      ...filter,
      page: query.page,
      limit: query.limit,
    });
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
    return {
      ...jobObj,
      items,
      currentAssignment,
      latestSample,
      files,
      allowedActions: this.allowedActions(job),
    };
  }

  static async statusCounts(user) {
    const match = await this.scopeFilter(user);
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
}

module.exports = JobOrderService;
