const mongoose = require("mongoose");

/* Shared atomic counter (same collection ProductionOrder.js uses) */
const counterSchema = new mongoose.Schema(
  { _id: { type: String }, seq: { type: Number, default: 0 } },
  { versionKey: false }
);
const ProductionCounter =
  mongoose.models.ProductionCounter ||
  mongoose.model("ProductionCounter", counterSchema, "productionCounters");

const reprintRequestSchema = new mongoose.Schema(
  {
    // Human-readable number shown in the UI, e.g. REP-2026-0012
    requestNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // older documents have no requestNo
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
      default: null,
      index: true,
    },
    // Order the defect was found on (the original, not the reprint order)
    productionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
      default: null,
      index: true,
    },
    // QC inspection that triggered this request (every correction stays linked to its QC record)
    qualityCheckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QualityCheck",
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requested By user is required"],
    },
    reason: {
      type: String,
      required: [true, "Reason for reprint is required"],
      trim: true,
    },
    defectType: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Reprint quantity is required"],
      min: 1,
    },
    sourceStage: {
      type: String,
      enum: ["PACKING", "QC", "FINISHING", "PRINTING", "DELIVERY"],
      default: "QC",
    },
    restartFromOperationCode: {
      type: String,
      default: "PRINT",
      trim: true,
    },
    cycleNo: {
      type: Number,
      default: 1,
    },
    details: {
      type: String,
      default: "",
    },
    attachments: [
      {
        fileUrl: { type: String, default: null },
        thumbnailUrl: { type: String, default: null },
        originalName: { type: String, default: "" },
      },
    ],
    // REQUESTED is the "pending manager approval" state
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "IN_PRODUCTION", "COMPLETED", "REJECTED"],
      default: "REQUESTED",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    markAsUrgent: {
      type: Boolean,
      default: false,
    },
    managerComments: {
      type: String,
      default: "",
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

reprintRequestSchema.index({ jobOrderId: 1, status: 1 });
reprintRequestSchema.index({ branchId: 1, status: 1, createdAt: -1 });
// Reprint list is newest-first; dashboards count a branch by created date; the order page lists its reprints
reprintRequestSchema.index({ createdAt: -1 });
reprintRequestSchema.index({ branchId: 1, createdAt: -1 });
reprintRequestSchema.index({ productionOrderId: 1, createdAt: 1 });

/**
 * Generate requestNo on first save: REP-<year>-<4 digit sequence>.
 */
reprintRequestSchema.pre("validate", async function (next) {
  if (this.requestNo) return next();
  try {
    const year = new Date().getFullYear();
    const counter = await ProductionCounter.findOneAndUpdate(
      { _id: `REP_${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.requestNo = `REP-${year}-${String(counter.seq).padStart(4, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Statics (defined BEFORE mongoose.model() compiles the schema)              */
/* ────────────────────────────────────────────────────────────────────────── */

// The old UI used PENDING for "waiting for approval"; the stored value is REQUESTED.
const normalizeStatus = (status) => {
  const s = String(status || "").toUpperCase().trim();
  if (s === "PENDING" || s === "PENDING_APPROVAL") return "REQUESTED";
  return s;
};

/**
 * Adds flat fields so list pages don't have to dig into populated objects.
 */
const flatten = (r) => {
  const job = r.jobOrderId && typeof r.jobOrderId === "object" ? r.jobOrderId : {};
  const po = r.productionOrderId && typeof r.productionOrderId === "object" ? r.productionOrderId : {};
  const requester = r.requestedBy && typeof r.requestedBy === "object" ? r.requestedBy : {};
  const approver = r.approvedBy && typeof r.approvedBy === "object" ? r.approvedBy : {};
  return {
    ...r,
    jobNo: job.jobNo || "",
    customerName: job.customerName || job.customerSnapshot?.name || "",
    productName: po.specificationsSnapshot?.productName || job.title || "",
    productionNo: po.productionNo || "",
    requestedByName: requester.name || requester.email || "",
    approvedByName: approver.name || approver.email || "",
    requestedQty: r.quantity,
  };
};

reprintRequestSchema.statics.findAll = async function (query = {}) {
  const filter = {};
  if (query.status) {
    const statuses = String(query.status)
      .split(",")
      .map(normalizeStatus)
      .filter((s) => s && s !== "ALL");
    if (statuses.length === 1) filter.status = statuses[0];
    else if (statuses.length > 1) filter.status = { $in: statuses };
  }
  if (query.branchId) filter.branchId = query.branchId;
  if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
  if (query.productionOrderId) filter.productionOrderId = query.productionOrderId;

  if (query.search && String(query.search).trim()) {
    const rx = new RegExp(String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const JobOrder = mongoose.model("JobOrder");
    const jobs = await JobOrder.find({ $or: [{ jobNo: rx }, { customerName: rx }] })
      .select("_id")
      .limit(500)
      .lean();
    filter.$or = [{ requestNo: rx }, { reason: rx }, { jobOrderId: { $in: jobs.map((j) => j._id) } }];
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    this.find(filter)
      .populate("jobOrderId", "jobNo title customerName customerSnapshot stage")
      .populate("productionOrderId", "productionNo cycleNo specificationsSnapshot")
      .populate("requestedBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return { items: rows.map(flatten), total, page, limit };
};

reprintRequestSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};

const ReprintRequest = mongoose.model(
  "ReprintRequest",
  reprintRequestSchema,
  "reprintRequests"
);

module.exports = ReprintRequest;