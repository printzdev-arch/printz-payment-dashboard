const mongoose = require("mongoose");

const jobAssignmentSchema = new mongoose.Schema(
  {
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true,
    },
    assignmentType: {
      type: String,
      enum: ["DESIGNER", "OPERATOR", "QC", "QC_INSPECTOR", "OTHER"],
      default: "DESIGNER",
      index: true,
    },
    assignmentMethod: {
      type: String,
      enum: ["ROUND_ROBIN", "MANUAL", "REASSIGN"],
      default: "ROUND_ROBIN",
    },
    sequenceNo: {
      type: Number,
      default: 1,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    currentAssignment: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "REJECTED", "REASSIGNED", "REPLACED", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

jobAssignmentSchema.index({ jobOrderId: 1, assignmentType: 1, currentAssignment: 1 });
jobAssignmentSchema.index({ employeeId: 1, status: 1, currentAssignment: 1 });
// Round-robin lookup, recent / rejected assignment lists and the designer dashboard
jobAssignmentSchema.index({ assignmentType: 1, assignmentMethod: 1, createdAt: -1 });
jobAssignmentSchema.index({ assignmentType: 1, status: 1, createdAt: -1 });
jobAssignmentSchema.index({ assignmentType: 1, assignedAt: -1, createdAt: -1 });
jobAssignmentSchema.index({ employeeId: 1, status: 1, assignedAt: -1 });
jobAssignmentSchema.index({ jobOrderId: 1, createdAt: -1 });
jobAssignmentSchema.index(
  { jobOrderId: 1, assignmentType: 1 },
  { unique: true, partialFilterExpression: { currentAssignment: true } }
);

const JobAssignment =
  mongoose.models.JobAssignment ||
  mongoose.model("JobAssignment", jobAssignmentSchema, "jobAssignments");


// === INJECTED REPOSITORY STATICS ===

jobAssignmentSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};


if (typeof jobAssignmentSchema !== "undefined" && typeof JobAssignment !== "undefined" && jobAssignmentSchema.statics) {
  Object.assign(JobAssignment, jobAssignmentSchema.statics);
}

module.exports = JobAssignment;
