const mongoose = require("mongoose");

const jobApprovalSchema = new mongoose.Schema(
  {
    approvalNo: {
      type: String,
      default: null,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
      index: true,
    },
    productionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
      default: null,
    },
    approvalType: {
      type: String,
      enum: ["ESTIMATE", "SAMPLE", "QC", "REPRINT", "DELIVERY", "PROOF", "REWORK", "CUSTOM"],
      required: true,
      index: true,
    },
    versionNo: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
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
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decisionAt: {
      type: Date,
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    comments: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

jobApprovalSchema.index({ jobOrderId: 1, approvalType: 1, versionNo: 1 });

const JobApproval =
  mongoose.models.JobApproval || mongoose.model("JobApproval", jobApprovalSchema, "jobApprovals");

module.exports = JobApproval;
