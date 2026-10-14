const mongoose = require("mongoose");

const estimateApprovalSchema = new mongoose.Schema(
  {
    approvalNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    estimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Estimate",
      default: null,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      default: null,
      index: true,
    },
    versionNo: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED", "REVISED"],
      default: "PENDING",
      index: true,
    },
    requestedFrom: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decisionAt: {
      type: Date,
      default: null,
    },
    approvalToken: {
      type: String,
      default: null,
      index: true,
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    approvalMethod: {
      type: String,
      enum: [
        "INTERNAL",
        "CUSTOMER_PORTAL",
        "DIGITAL_SIGNATURE",
        "EMAIL",
        "WHATSAPP",
        "MANUAL",
      ],
      default: "INTERNAL",
    },
    customerSignature: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    comments: {
      type: String,
      default: "",
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

estimateApprovalSchema.index({ estimateId: 1, versionNo: -1 });
estimateApprovalSchema.index({ jobOrderId: 1, versionNo: -1 });
estimateApprovalSchema.index({ status: 1, createdAt: -1 });

const EstimateApproval =
  mongoose.models.EstimateApproval ||
  mongoose.model("EstimateApproval", estimateApprovalSchema, "estimateApprovals");

module.exports = EstimateApproval;
