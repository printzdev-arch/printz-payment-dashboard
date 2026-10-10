const mongoose = require("mongoose");

const designApprovalTokenSchema = new mongoose.Schema(
  {
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
      index: true,
    },
    sampleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSample",
      required: true,
      index: true,
    },
    versionNo: {
      type: Number,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenPrefix: {
      type: String,
      default: "",
    },
    customerPhone: {
      type: String,
      default: "",
    },
    customerName: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED", "REVOKED", "SUPERSEDED"],
      default: "ACTIVE",
      index: true,
    },
    decision: {
      type: String,
      enum: ["APPROVED", "REVISION_REQUIRED", null],
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    customerFeedback: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    whatsappStatus: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED", "DISABLED", "MOCK"],
      default: "PENDING",
    },
    whatsappMessageId: {
      type: String,
      default: null,
    },
    whatsappSentAt: {
      type: Date,
      default: null,
    },
    whatsappError: {
      type: String,
      default: null,
    },
    approvalUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

designApprovalTokenSchema.index({ jobOrderId: 1, versionNo: 1, status: 1 });

const DesignApprovalToken =
  mongoose.models.DesignApprovalToken ||
  mongoose.model("DesignApprovalToken", designApprovalTokenSchema, "designApprovalTokens");

module.exports = DesignApprovalToken;
