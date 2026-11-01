const mongoose = require("mongoose");

const SalaryComponentSchema = new mongoose.Schema({
  // null = legacy/global component usable by every branch.
  branchId: { type: mongoose.Schema.Types.Mixed, ref: "Branch", default: null, index: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  componentType: { type: String, enum: ["EARNING", "DEDUCTION"], required: true },
  calculationType: { type: String, enum: ["FIXED", "PERCENTAGE", "PER_DAY", "PER_HOUR", "MANUAL"], default: "FIXED" },
  defaultAmount: { type: Number, min: 0, default: 0 },
  percentageOf: { type: String, enum: ["BASIC", "GROSS", "MONTHLY_SALARY"], default: "BASIC" },
  isTaxable: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true, index: true },
  description: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
}, {
  timestamps: true,
  versionKey: false,
  collection: "salarycomponents",
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// A code is unique within a branch, so each branch keeps its own catalog.
SalaryComponentSchema.index({ branchId: 1, code: 1 }, { unique: true });

module.exports = mongoose.models.SalaryComponent || mongoose.model("SalaryComponent", SalaryComponentSchema);
