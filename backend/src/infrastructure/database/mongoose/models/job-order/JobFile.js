const mongoose = require("mongoose");

const jobFileSchema = new mongoose.Schema(
  {
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
      index: true,
    },
    jobItemId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    fileCategory: {
      type: String,
      enum: ["CUSTOMER_SAMPLE", "REFERENCE", "PRINT_READY", "PROOFS", "FINAL_ARTWORK", "OTHER"],
      default: "REFERENCE",
      index: true,
    },
    attachmentId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: "",
    },
    versionNo: {
      type: Number,
      default: 1,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

jobFileSchema.index({ jobOrderId: 1, fileCategory: 1 });

const JobFile = mongoose.models.JobFile || mongoose.model("JobFile", jobFileSchema, "jobFiles");

module.exports = JobFile;
