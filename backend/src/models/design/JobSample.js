const mongoose = require("mongoose");

const jobSampleSchema = new mongoose.Schema(
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
    versionNo: {
      type: Number,
      required: true,
      default: 1,
    },
    revisionNo: {
      type: Number,
      default: 0,
    },
    fileId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    comments: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REVISION_REQUIRED"],
      default: "DRAFT",
      index: true,
    },
    customerPhone: {
      type: String,
      default: "",
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    customerFeedback: {
      type: String,
      default: "",
    },
    revisionReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

jobSampleSchema.index({ jobOrderId: 1, versionNo: -1 });

const JobSample = mongoose.models.JobSample || mongoose.model("JobSample", jobSampleSchema, "jobSamples");


// === INJECTED REPOSITORY STATICS ===

jobSampleSchema.statics.findByJobOrderId = async function (jobOrderId) {
  return this.find({ jobOrderId }).sort({ versionNo: -1 });
};

jobSampleSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};


if (typeof jobSampleSchema !== "undefined" && typeof JobSample !== "undefined" && jobSampleSchema.statics) {
  Object.assign(JobSample, jobSampleSchema.statics);
}

module.exports = JobSample;
