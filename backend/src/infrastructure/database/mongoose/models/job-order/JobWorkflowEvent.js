const mongoose = require("mongoose");

const jobWorkflowEventSchema = new mongoose.Schema(
  {
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
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOperation",
      default: null,
    },
    eventType: {
      type: String,
      default: null,
    },
    stage: {
      type: String,
      required: true,
      index: true,
    },
    fromStage: {
      type: String,
      default: null,
    },
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      default: null,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    relatedSampleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSample",
      default: null,
    },
    relatedReprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReprintRequest",
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

jobWorkflowEventSchema.index({ jobOrderId: 1, createdAt: 1 });

const JobWorkflowEvent =
  mongoose.models.JobWorkflowEvent ||
  mongoose.model("JobWorkflowEvent", jobWorkflowEventSchema, "jobWorkflowEvents");

module.exports = JobWorkflowEvent;
