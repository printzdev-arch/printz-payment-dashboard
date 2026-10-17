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
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOperation",
      default: null,
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
    reprintRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReprintRequest",
      default: null,
    },
    reworkOperationCode: {
      type: String,
      default: null,
    },
    restartFromOperationCode: {
      type: String,
      default: null,
    },
    comments: {
      type: String,
      default: "",
    },
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

const QualityCheck = mongoose.model(
  "QualityCheck",
  qualityCheckSchema,
  "qualityChecks"
);


// === INJECTED REPOSITORY STATICS ===

qualityCheckSchema.statics.findAll = async function (query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.productionOrderId) filter.productionOrderId = query.productionOrderId;
  if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
  if (query.branchId) filter.branchId = query.branchId;

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.find(filter)
      .populate("productionOrderId", "orderNo status priority")
      .populate("jobOrderId", "jobNo title customerName customerSnapshot stage")
      .populate("checkedBy", "name email")
      .populate("inspectorId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

qualityCheckSchema.statics.findPending = async function (branchId = null) {
  const query = { status: "PENDING" };
  if (branchId) query.branchId = branchId;
  return this.find(query)
    .populate("productionOrderId")
    .populate("jobOrderId")
    .sort({ createdAt: -1 });
};

qualityCheckSchema.statics.findByProductionOrder = async function (productionOrderId) {
  return this.find({ productionOrderId })
    .populate("inspectorId", "name email")
    .sort({ createdAt: -1 });
};

qualityCheckSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};


if (typeof qualityCheckSchema !== "undefined" && typeof QualityCheck !== "undefined" && qualityCheckSchema.statics) {
  Object.assign(QualityCheck, qualityCheckSchema.statics);
}

module.exports = QualityCheck;
