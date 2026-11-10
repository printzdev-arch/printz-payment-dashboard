const mongoose = require("mongoose");

const SalaryRunSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.Mixed, ref: "Branch", required: true, index: true },
  payrollMonth: { type: Number, required: true, min: 1, max: 12 },
  payrollYear: { type: Number, required: true, min: 2000, max: 2100 },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  status: { type: String, enum: ["DRAFT", "CALCULATING", "CALCULATED", "APPROVED", "PAID", "LOCKED"], default: "DRAFT", index: true },
  calculationAttemptId: { type: String, default: null, index: true },
  employeeCount: { type: Number, default: 0, min: 0 },
  totalGrossPay: { type: Number, default: 0, min: 0 },
  totalDeductions: { type: Number, default: 0, min: 0 },
  totalNetPay: { type: Number, default: 0, min: 0 },
  calculatedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  // Set when a Super Admin sends an approved run back to calculated; the last one is kept
  reopenedBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
  reopenedAt: { type: Date, default: null },
  reopenReason: { type: String, default: "" },
  paidAt: { type: Date, default: null },
  lockedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
}, {
  timestamps: true,
  versionKey: false,
  collection: "salaryruns",
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const { getTodayDateString } = require("../../../utils/helpers/dateUtils");

SalaryRunSchema.virtual("isMidMonthPreview").get(function () {
  if (!this.payrollYear || !this.payrollMonth || !this.calculatedAt) return false;
  if (["APPROVED", "PAID", "LOCKED"].includes(this.status)) return false;
  const days = new Date(Date.UTC(this.payrollYear, this.payrollMonth, 0)).getUTCDate();
  const endDateStr = `${this.payrollYear}-${String(this.payrollMonth).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
  const calcDateStr = getTodayDateString(this.calculatedAt);
  return calcDateStr <= endDateStr;
});

SalaryRunSchema.index({ branchId: 1, payrollYear: 1, payrollMonth: 1 }, { unique: true });
module.exports = mongoose.models.SalaryRun || mongoose.model("SalaryRun", SalaryRunSchema);
