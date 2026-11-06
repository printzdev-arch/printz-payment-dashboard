const mongoose = require("mongoose");

const qualityCheckSchema = new mongoose.Schema(
  {
    productionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
      required: [true, "Production Order ID is required"],
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
    },
    // Copied from the production order so QC lists can be filtered by branch
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOperation",
      default: null,
    },
    // Production cycle this inspection belongs to (0 = original, n = reprint/rework cycle)
    cycleNo: {
      type: Number,
      default: 0,
    },
    checkType: {
      type: String,
      enum: ["FINAL", "STAGE"],
      default: "FINAL",
      required: true,
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Checked By inspector is required"],
      index: true,
    },
    inspectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    checkedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    result: {
      type: String,
      enum: ["PASS", "ISSUE", "FAIL", "CONDITIONAL"],
      required: [true, "QC Result is required"],
      index: true,
    },
    quantityChecked: {
      type: Number,
      default: 0,
    },
    acceptedQty: {
      type: Number,
      default: 0,
    },
    rejectedQty: {
      type: Number,
      default: 0,
    },
    defects: [
      {
        code: { type: String, default: "" },
        description: { type: String, default: "" },
        severity: {
          type: String,
          enum: ["MINOR", "MAJOR", "CRITICAL"],
          default: "MINOR",
        },
        affectedQuantity: { type: Number, default: 0, min: 0 },
        notes: { type: String, default: "" },
        // Defect evidence (photos, scans)
        attachments: [
          {
            fileUrl: { type: String, default: null },
            thumbnailUrl: { type: String, default: null },
            originalName: { type: String, default: "" },
          },
        ],
      },
    ],
    issueDetails: {
      type: String,
      default: "",
    },
    correctiveAction: {
      type: String,
      enum: ["REWORK", "REPRINT", "NONE", null],
      default: null,
    },
    reprintQuantity: {
      type: Number,
      default: null,
      min: 0,
    },
    reprintRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReprintRequest",
      default: null,
    },
    reworkOperationCode: {
      type: String,
      default: null,
    },
    // Rejected pieces can need rework from different steps (e.g. 20 from Printing, 10 from Packing)
    reworkLines: [
      {
        _id: false,
        operationCode: { type: String },
        quantity: { type: Number },
      },
    ],
    restartFromOperationCode: {
      type: String,
      default: null,
    },
    comments: {
      type: String,
      default: "",
    },
    // Inspection-level evidence
    attachments: [
      {
        fileUrl: { type: String, default: null },
        thumbnailUrl: { type: String, default: null },
        originalName: { type: String, default: "" },
      },
    ],
    checklist: [
      {
        item: { type: String, default: "" },
        result: {
          type: String,
          enum: ["PASS", "FAIL", "NA"],
          default: "PASS",
        },
        passed: {
          type: Boolean,
          default: true,
        },
        notes: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
    strictPopulate: false,
  }
);

qualityCheckSchema.index({ productionOrderId: 1, checkedAt: -1 });
qualityCheckSchema.index({ jobOrderId: 1, result: 1 });
qualityCheckSchema.index({ branchId: 1, result: 1 });
qualityCheckSchema.index({ checkedAt: -1 });
qualityCheckSchema.index({ branchId: 1, checkedAt: -1 });

/**
 * A failed inspection must always name a corrective action, otherwise the
 * production order is left stuck with no rework or reprint to resolve it.
 */
qualityCheckSchema.pre("validate", function (next) {
  const passed = this.result === "PASS" || this.result === "CONDITIONAL";
  if (!passed && !["REWORK", "REPRINT"].includes(this.correctiveAction)) {
    this.invalidate(
      "correctiveAction",
      "A failed QC result requires a corrective action: REWORK or REPRINT."
    );
  }
  next();
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Statics (defined BEFORE mongoose.model() compiles the schema)              */
/* ────────────────────────────────────────────────────────────────────────── */

qualityCheckSchema.statics.findAll = async function (query = {}) {
  const filter = {};

  // "status" is accepted for the old API shape and mapped to result
  const result = query.result || query.status;
  if (result) {
    const r = String(result).toUpperCase();
    // PENDING is not an inspection result; pending items are production orders (see findPending)
    if (r !== "PENDING" && r !== "ALL") {
      filter.result = r === "PASSED" ? "PASS" : r === "FAILED" ? "FAIL" : r;
    }
  }
  if (query.productionOrderId) filter.productionOrderId = query.productionOrderId;
  if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.checkType) filter.checkType = String(query.checkType).toUpperCase();

  if (query.from || query.to) {
    filter.checkedAt = {};
    if (query.from) filter.checkedAt.$gte = new Date(query.from);
    if (query.to) filter.checkedAt.$lte = new Date(`${String(query.to).slice(0, 10)}T23:59:59.999Z`);
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.find(filter)
      .populate("productionOrderId", "productionNo status priority plannedQty cycleNo cycleType")
      .populate("jobOrderId", "jobNo title customerName customerSnapshot stage")
      .populate("checkedBy", "name email")
      .populate("inspectorId", "name email")
      .sort({ checkedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

/**
 * Items waiting for inspection are PRODUCTION ORDERS in status QC,
 * not QualityCheck records (a QualityCheck only exists after inspection).
 */
qualityCheckSchema.statics.findPending = async function (branchId = null) {
  const ProductionOrder = mongoose.model("ProductionOrder");
  const query = { status: "QC" };
  if (branchId) query.branchId = branchId;

  return ProductionOrder.find(query)
    .populate("jobOrderId", "jobNo title customerName customerSnapshot customerPhone dueDate stage")
    .populate("branchId", "name code")
    .sort({ updatedAt: -1 })
    .lean();
};

qualityCheckSchema.statics.findByProductionOrder = async function (productionOrderId) {
  return this.find({ productionOrderId })
    .populate("checkedBy", "name email")
    .populate("inspectorId", "name email")
    .sort({ checkedAt: -1 });
};

/**
 * Full record for the QC report (job, production order, inspector populated).
 */
qualityCheckSchema.statics.findByIdWithDetails = async function (id) {
  return this.findById(id)
    .populate("productionOrderId")
    .populate("jobOrderId")
    .populate("checkedBy", "name email role")
    .populate("inspectorId", "name email role");
};

qualityCheckSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};

const QualityCheck = mongoose.model(
  "QualityCheck",
  qualityCheckSchema,
  "qualityChecks"
);

module.exports = QualityCheck;