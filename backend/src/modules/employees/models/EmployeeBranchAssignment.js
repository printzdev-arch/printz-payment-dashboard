const mongoose = require("mongoose");

const EmployeeBranchAssignmentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Employee",
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      required: true,
      index: true,
    },
    roleId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Role",
      default: null,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      default: null,
    },
    isPrimary: {
      type: Boolean,
      default: true,
    },
    assignmentType: {
      type: String,
      enum: ["PERMANENT", "TEMPORARY"],
      default: "PERMANENT",
      index: true,
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    sourceBranchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      default: null,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },
    endedEarlyAt: {
      type: Date,
      default: null,
    },
    endedEarlyBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "employeeBranchAssignments",
  }
);

EmployeeBranchAssignmentSchema.index({ branchId: 1, isPrimary: 1, fromDate: 1, toDate: 1 });
EmployeeBranchAssignmentSchema.index({ employeeId: 1, isPrimary: 1, fromDate: 1, toDate: 1 });
EmployeeBranchAssignmentSchema.index({ employeeId: 1, status: 1 });

module.exports =
  mongoose.models.EmployeeBranchAssignment ||
  mongoose.model("EmployeeBranchAssignment", EmployeeBranchAssignmentSchema);
