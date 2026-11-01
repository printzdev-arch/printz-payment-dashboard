const mongoose = require("mongoose");

const LoanRepaymentSchema = new mongoose.Schema({
  employeeLoanId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeLoan", required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.Mixed, ref: "Employee", required: true, index: true },
  salaryRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryRecord", default: null, index: true },
  salaryRunId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryRun", default: null, index: true },

  repaymentNumber: { type: Number, required: true, min: 1 },
  repaymentDate: { type: Date, required: true },
  payrollMonth: { type: Number, min: 1, max: 12, default: null },
  payrollYear: { type: Number, default: null },

  amount: { type: Number, required: true, min: 0 },
  previousBalance: { type: Number, required: true, min: 0 },
  remainingBalance: { type: Number, required: true, min: 0 },
  paymentMethod: {
    type: String,
    enum: ["SALARY_DEDUCTION", "CASH", "BANK_TRANSFER", "OTHER"],
    default: "SALARY_DEDUCTION"
  },
  remarks: { type: String, default: "" },

  createdBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null }
}, {
  timestamps: true,
  versionKey: false,
  collection: "loanrepayments",
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// Prevent duplicate loan repayment deductions for the same loan in the same salary record
// Partial unique index: allows multiple manual repayments where salaryRecordId is null
LoanRepaymentSchema.index(
  { employeeLoanId: 1, salaryRecordId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      salaryRecordId: { $type: ["objectId", "string"] }
    }
  }
);
LoanRepaymentSchema.index({ employeeLoanId: 1, repaymentNumber: 1 }, { unique: true });
LoanRepaymentSchema.index({ employeeLoanId: 1, repaymentDate: -1 });


module.exports = mongoose.models.LoanRepayment || mongoose.model("LoanRepayment", LoanRepaymentSchema);
