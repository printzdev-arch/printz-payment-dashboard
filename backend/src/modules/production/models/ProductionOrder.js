const mongoose = require("mongoose");

/* ────────────────────────────────────────────────────────────────────────── */
/* Status lifecycle                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

// UI labels: UNASSIGNED = "Unplanned", QC = "Awaiting QC"
const ORDER_STATUSES = [
  "UNASSIGNED",
  "PLANNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "QC",
  "QC_PASSED",
  "QC_ISSUE",
  "REWORK_REQUIRED",
  "REPRINT_REQUIRED",
  "COMPLETED",
  "CANCELLED",
];

// Single source of truth for allowed transitions. Services should call
// order.transitionTo(...) instead of assigning order.status directly.
const ALLOWED_TRANSITIONS = {
  UNASSIGNED: ["PLANNED", "CANCELLED"],
  PLANNED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "QC", "CANCELLED"],
  ON_HOLD: ["PLANNED", "IN_PROGRESS", "CANCELLED"],
  QC: ["QC_PASSED", "QC_ISSUE", "REWORK_REQUIRED", "REPRINT_REQUIRED", "ON_HOLD", "CANCELLED"],
  QC_ISSUE: ["REWORK_REQUIRED", "REPRINT_REQUIRED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  REWORK_REQUIRED: ["IN_PROGRESS", "CANCELLED"],
  REPRINT_REQUIRED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  QC_PASSED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const CLOSED_STATUSES = ["COMPLETED", "CANCELLED"];

/* ────────────────────────────────────────────────────────────────────────── */
/* Atomic production number counter (avoids count + 1 duplicate races)        */
/* ────────────────────────────────────────────────────────────────────────── */

const counterSchema = new mongoose.Schema(
  { _id: { type: String }, seq: { type: Number, default: 0 } },
  { versionKey: false }
);
const ProductionCounter =
  mongoose.models.ProductionCounter ||
  mongoose.model("ProductionCounter", counterSchema, "productionCounters");

/* ────────────────────────────────────────────────────────────────────────── */
/* Schema                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const productionOrderSchema = new mongoose.Schema(
  {
    productionNo: {
      type: String,
      required: [true, "Production number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: [true, "Job Order ID is required"],
      index: true,
    },
    jobItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "UNASSIGNED",
      index: true,
    },
    statusHistory: [
      {
        from: { type: String, default: null },
        to: { type: String, required: true },
        reason: { type: String, default: "" },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT", "RUSH"],
      default: "NORMAL",
      uppercase: true,
      index: true,
    },

    // ── Quantities ──
    plannedQty: { type: Number, default: 0 },
    actualQty: { type: Number, default: 0 },
    approvedQty: { type: Number, default: 0 },
    rejectedQty: { type: Number, default: 0 },
    reworkedQty: { type: Number, default: 0 },
    reprintedQty: { type: Number, default: 0 },
    progressPct: { type: Number, default: 0, min: 0, max: 100 },

    // ── Schedule ──
    plannedStart: { type: Date, default: null },
    plannedEnd: { type: Date, default: null },
    actualStart: { type: Date, default: null },
    actualEnd: { type: Date, default: null },

    // ── Resources ──
    machine: { type: String, default: null },
    assignedEmployees: [{ type: String }],
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Printer",
      default: null,
    },
    assignedEmployeeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    leadOperator: { type: String, default: "" },
    productionManager: { type: String, default: "" },

    // ── Planning ──
    planningStatus: {
      type: String,
      enum: ["UNPLANNED", "DRAFT", "PLANNED"],
      default: "UNPLANNED",
      index: true,
    },
    planVersion: { type: Number, default: 0 },
    planHistory: [
      {
        version: Number,
        savedAt: { type: Date, default: Date.now },
        savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        snapshot: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    materials: [
      {
        // Link to the stock item (the existing stock collection); used to deduct stock when work is completed
        itemId: { type: mongoose.Schema.Types.Mixed, default: null },
        name: String,
        spec: String,
        requiredQty: Number,
        unit: String,
        availableStock: Number,
        shortage: Number,
        relatedOperation: String,
        remarks: String,
      },
    ],

    approvedSample: {
      fileUrl: { type: String, default: null },
      thumbnailUrl: { type: String, default: null },
      customerComments: { type: String, default: "" },
      approvedAt: { type: Date, default: null },
    },

    // ── Correction cycles ──
    cycleNo: {
      type: Number,
      default: 0,
      index: true,
    },
    cycleType: {
      type: String,
      enum: ["ORIGINAL", "REPRINT", "REWORK"],
      default: "ORIGINAL",
      index: true,
    },
    parentProductionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
      default: null,
      index: true,
    },
    reprintRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReprintRequest",
      default: null,
      index: true,
    },

    notes: { type: String, default: "" },
    holdReason: { type: String, default: null },
    cancelReason: { type: String, default: null },
    specificationsSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    operationsSnapshot: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
    strictPopulate: false,
  }
);

productionOrderSchema.index({ jobOrderId: 1, status: 1 });
productionOrderSchema.index({ branchId: 1, status: 1, createdAt: -1 });
productionOrderSchema.index({ jobOrderId: 1, jobItemId: 1, cycleType: 1, cycleNo: 1 });
// Order list is newest-first; the production dashboard reads by status with update / planned / actual end dates
productionOrderSchema.index({ createdAt: -1 });
productionOrderSchema.index({ branchId: 1, createdAt: -1 });
productionOrderSchema.index({ status: 1, updatedAt: -1 });
productionOrderSchema.index({ status: 1, plannedEnd: 1 });
productionOrderSchema.index({ status: 1, actualEnd: -1 });

/* ────────────────────────────────────────────────────────────────────────── */
/* Instance methods                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Validated status change with history entry.
 * Does NOT save; the caller saves (so other field changes go in one write).
 */
productionOrderSchema.methods.transitionTo = function (newStatus, { reason = "", userId = null } = {}) {
  if (!ORDER_STATUSES.includes(newStatus)) {
    const ErrorHelper = require("../../../utils/errors/ApiError");
    throw ErrorHelper.badRequest(`Unknown production order status '${newStatus}'.`);
  }
  if (this.status === newStatus) return this;

  const allowed = ALLOWED_TRANSITIONS[this.status] || [];
  if (!allowed.includes(newStatus)) {
    const ErrorHelper = require("../../../utils/errors/ApiError");
    throw ErrorHelper.conflict(
      `Invalid status change: ${this.status} -> ${newStatus}. Allowed: ${allowed.join(", ") || "none"}.`
    );
  }

  this.statusHistory.push({
    from: this.status,
    to: newStatus,
    reason,
    changedBy: userId,
    changedAt: new Date(),
  });
  this.status = newStatus;
  return this;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Statics (defined BEFORE mongoose.model() compiles the schema)              */
/* ────────────────────────────────────────────────────────────────────────── */

const JOB_POPULATE_FIELDS =
  "jobNo title customerName customerSnapshot customerPhone dueDate priority stage currentStage designProofUrl designStatus proofUrl sampleUrl approvedSampleUrl attachments jobFiles specs customerRequirements remarks updatedAt";

/**
 * Atomic sequential number, e.g. nextProductionNo("PO-20261023") -> "PO-20261023-0001"
 */
productionOrderSchema.statics.nextProductionNo = async function (prefix) {
  const counter = await ProductionCounter.findOneAndUpdate(
    { _id: `PO_${prefix}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix.startsWith("PO-") ? prefix : `PO-${prefix}`}-${String(counter.seq).padStart(4, "0")}`;
};

productionOrderSchema.statics.findAll = async function (query = {}) {
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (query.status) {
    const statuses = Array.isArray(query.status)
      ? query.status
      : String(query.status).split(",").map((s) => s.trim()).filter(Boolean);
    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  if (query.planningStatus) filter.planningStatus = String(query.planningStatus).toUpperCase();
  if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
  if (query.machineId) filter.machineId = query.machineId;
  if (query.priority) filter.priority = String(query.priority).toUpperCase();

  // Date range on planned start (falls back to created date)
  if (query.from || query.to) {
    const range = {};
    if (query.from) range.$gte = new Date(query.from);
    if (query.to) range.$lte = new Date(`${String(query.to).slice(0, 10)}T23:59:59.999Z`);
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ plannedStart: range }, { plannedStart: null, createdAt: range }] },
    ];
  }

  // Date range on completion (actualEnd, or last update for older orders without one)
  if (query.completedFrom || query.completedTo) {
    const done = {};
    if (query.completedFrom) done.$gte = new Date(`${String(query.completedFrom).slice(0, 10)}T00:00:00.000`);
    if (query.completedTo) done.$lte = new Date(`${String(query.completedTo).slice(0, 10)}T23:59:59.999`);
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ actualEnd: done }, { actualEnd: null, updatedAt: done }] },
    ];
  }

  // Search: production number, job number, customer name
  if (query.search && String(query.search).trim()) {
    const rx = new RegExp(String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const JobOrder = mongoose.model("JobOrder");
    const matchingJobs = await JobOrder.find({
      $or: [{ jobNo: rx }, { customerName: rx }, { title: rx }],
    })
      .select("_id")
      .limit(500)
      .lean();
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ productionNo: rx }, { jobOrderId: { $in: matchingJobs.map((j) => j._id) } }] },
    ];
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.find(filter)
      .populate("jobOrderId", JOB_POPULATE_FIELDS)
      .populate("branchId", "name code")
      .populate("machineId", "printerName model")
      .populate("assignedEmployeeIds", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

/**
 * Orders whose operations should appear in the floor queue.
 * ON_HOLD is included so held work shows as held instead of vanishing.
 */
productionOrderSchema.statics.findActiveOrders = async function (branchId = null) {
  const orderQuery = {
    status: { $in: ["PLANNED", "IN_PROGRESS", "ON_HOLD"] },
  };
  if (branchId) orderQuery.branchId = branchId;

  return this.find(orderQuery)
    .sort({ createdAt: -1 })
    .select(
      "_id productionNo jobOrderId jobItemId branchId priority status plannedQty plannedStart plannedEnd cycleNo cycleType approvedSample specificationsSnapshot createdAt updatedAt"
    )
    .populate("jobOrderId", "jobNo title customerName customerPhone dueDate priority stage")
    .populate("branchId", "name code")
    .lean();
};

productionOrderSchema.statics.findByIdWithDetails = async function (id) {
  return this.findById(id)
    .populate("jobOrderId")
    .populate("branchId")
    .populate("machineId")
    .populate("assignedEmployeeIds");
};

productionOrderSchema.statics.countToday = async function (branchId = null) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  };
  if (branchId) query.branchId = branchId;

  return this.countDocuments(query);
};

/**
 * KPI counts for the dashboard. Counts come from the database,
 * not from a paginated list.
 */
productionOrderSchema.statics.getStats = async function ({ branchId = null, from = null, to = null } = {}) {
  const match = {};
  if (branchId) match.branchId = new mongoose.Types.ObjectId(String(branchId));
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(`${String(to).slice(0, 10)}T23:59:59.999Z`);
  }

  const now = new Date();
  const [byStatus, byBranch, delayed, byCycle] = await Promise.all([
    this.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    this.aggregate([
      { $match: match },
      { $group: { _id: "$branchId", count: { $sum: 1 } } },
      { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "branch" } },
      { $project: { count: 1, branchName: { $arrayElemAt: ["$branch.name", 0] } } },
    ]),
    this.countDocuments({
      ...match,
      plannedEnd: { $lt: now },
      status: { $nin: CLOSED_STATUSES.concat(["QC_PASSED"]) },
    }),
    this.aggregate([{ $match: match }, { $group: { _id: "$cycleType", count: { $sum: 1 } } }]),
  ]);

  const statusCounts = {};
  byStatus.forEach((r) => {
    statusCounts[r._id] = r.count;
  });
  const cycleCounts = {};
  byCycle.forEach((r) => {
    cycleCounts[r._id] = r.count;
  });
  const total = byStatus.reduce((sum, r) => sum + r.count, 0);
  const c = (k) => statusCounts[k] || 0;

  return {
    total,
    unplanned: c("UNASSIGNED"),
    planned: c("PLANNED"),
    inProgress: c("IN_PROGRESS"),
    onHold: c("ON_HOLD"),
    awaitingQc: c("QC"),
    reworkRequired: c("REWORK_REQUIRED") + c("QC_ISSUE"),
    reprintRequired: c("REPRINT_REQUIRED"),
    completed: c("COMPLETED") + c("QC_PASSED"),
    cancelled: c("CANCELLED"),
    delayed,
    reprintOrders: cycleCounts.REPRINT || 0,
    statusCounts,
    byBranch: byBranch.map((b) => ({ branchId: b._id, branchName: b.branchName || "Unknown", count: b.count })),
  };
};

/**
 * Plain field update. For status changes use order.transitionTo() instead.
 */
productionOrderSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};

productionOrderSchema.statics.save = async function (doc) {
  if (doc && typeof doc.save === "function") {
    return doc.save();
  }
  const item = new this(doc);
  return item.save();
};

const ProductionOrder = mongoose.model(
  "ProductionOrder",
  productionOrderSchema,
  "productionOrders"
);

ProductionOrder.ORDER_STATUSES = ORDER_STATUSES;
ProductionOrder.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;
ProductionOrder.CLOSED_STATUSES = CLOSED_STATUSES;

module.exports = ProductionOrder;