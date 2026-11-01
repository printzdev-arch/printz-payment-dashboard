const mongoose = require("mongoose");

const EmployeeLoanSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.Mixed, ref: "Employee", required: true, index: true },
  branchId: { type: mongoose.Schema.Types.Mixed, ref: "Branch", required: true, index: true },
  loanNumber: { type: String, trim: true, unique: true, sparse: true },
  loanAmount: { type: Number, required: true, min: 0 },
  loanDate: { type: Date, required: true },
  emiAmount: { type: Number, required: true, min: 0 },
  totalRepaid: { type: Number, default: 0, min: 0 },
  outstandingBalance: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["ACTIVE", "CLOSED", "ON_HOLD"], default: "ACTIVE", index: true },
  // true: payroll deducts the EMI automatically; false: repayments are recorded by hand.
  autoDeduct: { type: Boolean, default: true },
  // Months in which payroll must not deduct the EMI. The balance is untouched, so the
  // loan simply finishes one month later (the EMI is postponed, never doubled).
  skippedMonths: {
    type: [{
      month: { type: Number, min: 1, max: 12, required: true },
      year: { type: Number, required: true },
      reason: { type: String, default: "" },
      skippedBy: { type: mongoose.Schema.Types.Mixed, default: null },
      skippedAt: { type: Date, default: Date.now },
      _id: false,
    }],
    default: [],
  },
  remarks: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
}, {
  timestamps: true,
  versionKey: false,
  collection: "employeeloans",
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

EmployeeLoanSchema.index({ employeeId: 1, status: 1 });
module.exports = mongoose.models.EmployeeLoan || mongoose.model("EmployeeLoan", EmployeeLoanSchema);
