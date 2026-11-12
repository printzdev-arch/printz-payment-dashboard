const mongoose = require("mongoose");

const SalaryAdjustmentSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.Mixed, ref: "Employee", required: true, index: true },
  branchId: { type: mongoose.Schema.Types.Mixed, ref: "Branch", required: true, index: true },
  salaryRunId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryRun", default: null, index: true },
  salaryRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryRecord", default: null, index: true },

  payrollMonth: { type: Number, required: true, min: 1, max: 12 },
  payrollYear: { type: Number, required: true },
  adjustmentType: {
    type: String,
    enum: ["INCENTIVE", "ADVANCE", "SHORTAGE", "WASTAGE", "EMPLOYEE_PURCHASE", "OTHER_DEDUCTION", "OTHER_EARNING"],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ["PENDING", "APPLIED", "CANCELLED"], default: "PENDING", index: true },
  appliedAt: { type: Date, default: null },

  createdBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null }
}, {
  timestamps: true,
  versionKey: false,
  collection: "salaryadjustments",
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


SalaryAdjustmentSchema.index({ employeeId: 1, payrollYear: 1, payrollMonth: 1, status: 1 });
// Adjustment list is newest-first, optionally for a branch and payroll month
SalaryAdjustmentSchema.index({ createdAt: -1, _id: -1 });
SalaryAdjustmentSchema.index({ branchId: 1, payrollYear: 1, payrollMonth: 1, status: 1 });
module.exports = mongoose.models.SalaryAdjustment || mongoose.model("SalaryAdjustment", SalaryAdjustmentSchema);
