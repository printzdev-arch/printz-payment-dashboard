const mongoose = require("mongoose");

const reprintRequestSchema = new mongoose.Schema(
  {
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
    productionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
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
    activityRefs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AuditLog",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

reprintRequestSchema.index({ jobOrderId: 1, status: 1 });

const ReprintRequest = mongoose.model(
  "ReprintRequest",
  reprintRequestSchema,
  "reprintRequests"
);


// === INJECTED REPOSITORY STATICS ===

reprintRequestSchema.statics.findAll = async function (query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.find(filter)
      .populate("jobOrderId", "jobNo title customerName stage")
      .populate("requestedBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

reprintRequestSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};


if (typeof reprintRequestSchema !== "undefined" && typeof ReprintRequest !== "undefined" && reprintRequestSchema.statics) {
  Object.assign(ReprintRequest, reprintRequestSchema.statics);
}

module.exports = ReprintRequest;
