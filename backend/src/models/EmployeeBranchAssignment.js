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
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "employeeBranchAssignments",
  }
);

module.exports =
  mongoose.models.EmployeeBranchAssignment ||
  mongoose.model("EmployeeBranchAssignment", EmployeeBranchAssignmentSchema);
