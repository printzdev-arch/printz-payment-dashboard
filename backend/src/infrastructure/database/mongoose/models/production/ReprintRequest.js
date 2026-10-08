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

module.exports = ReprintRequest;
