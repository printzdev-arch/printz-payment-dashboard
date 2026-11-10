const mongoose = require("mongoose");

const RecordComponentSchema = new mongoose.Schema({
  componentId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryComponent", default: null },
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  componentType: { type: String, enum: ["EARNING", "DEDUCTION"], required: true },
  calculationType: {
    type: String,
    enum: ["FIXED", "PERCENTAGE", "PER_DAY", "PER_HOUR", "MANUAL"],
    default: "FIXED"
  },
  percentageOf: {
    type: String,
    enum: ["BASIC", "GROSS", "MONTHLY_SALARY"],
    default: "BASIC"
  },
  rate: { type: Number, default: 0 },
  amount: { type: Number, required: true, min: 0 },
  isTaxable: { type: Boolean, default: false }
}, { _id: false });

// Temporary branch shifts the employee had during the payroll month (snapshot taken at calculation).
const BranchShiftSchema = new mongoose.Schema({
  shiftId: { type: mongoose.Schema.Types.Mixed, default: null },
  branchId: { type: mongoose.Schema.Types.Mixed, default: null },
  branchName: { type: String, default: "" },
  fromDate: { type: String, required: true }, // YYYY-MM-DD, clamped to the payroll month
  toDate: { type: String, required: true },
  totalDays: { type: Number, default: 0, min: 0 }
}, { _id: false });

const SalaryRecordSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.Mixed, ref: "Employee", required: true, index: true },
  branchId: { type: mongoose.Schema.Types.Mixed, ref: "Branch", required: true, index: true },
  attendancePolicyId: { type: mongoose.Schema.Types.Mixed, ref: "AttendancePolicy", default: null },
  salaryRunId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryRun", default: null, index: true },

  payrollMonth: { type: Number, required: true, min: 1, max: 12 },
  payrollYear: { type: Number, required: true },

  monthlySalary: { type: Number, required: true, min: 0 },
  calendarDaysInMonth: { type: Number, required: true, min: 1, max: 31 },
  monthlyLeaveAllowance: { type: Number, default: 4, min: 0, max: 31 },
  salaryCalculationDays: { type: Number, required: true, min: 1 },

  requiredWorkingHoursPerDay: { type: Number, required: true, min: 0, max: 24 },
  daysToBeWorked: { type: Number, default: 0, min: 0 },
  daysWorked: { type: Number, default: 0, min: 0 },

  totalRegularHours: { type: Number, default: 0, min: 0 },
  totalWorkingHours: { type: Number, default: 0, min: 0 },
  totalOtHours: { type: Number, default: 0, min: 0 },

  hourlySalary: { type: Number, required: true, min: 0 },
  perDaySalary: { type: Number, required: true, min: 0 },
  salaryOfThisMonth: { type: Number, required: true, min: 0 },
  otAmount: { type: Number, default: 0, min: 0 },

  // Temporary branch shifts during this payroll month (empty when the employee was not shifted)
  branchShifts: { type: [BranchShiftSchema], default: [] },

  // Itemized components breakdown
  components: { type: [RecordComponentSchema], default: [] },
  totalComponentEarnings: { type: Number, default: 0, min: 0 },
  totalComponentDeductions: { type: Number, default: 0, min: 0 },

  mobileSubmissionIncentive: { type: Number, default: 0, min: 0 },
  otherIncentive: { type: Number, default: 0, min: 0 },

  advanceTakenInPresentMonth: { type: Number, default: 0, min: 0 },
  shortageDeduction: { type: Number, default: 0, min: 0 },
  wastageDeduction: { type: Number, default: 0, min: 0 },
  employeePurchaseDeduction: { type: Number, default: 0, min: 0 },
  loanEmi: { type: Number, default: 0, min: 0 },
  // EMI that would have been deducted this month but was skipped on request (postponed).
  skippedLoanEmi: { type: Number, default: 0, min: 0 },
  otherDeductions: { type: Number, default: 0, min: 0 },
  lopDays: { type: Number, default: 0, min: 0 },
  paidLeaveDays: { type: Number, default: 0, min: 0 },
  unpaidLeaveDays: { type: Number, default: 0, min: 0 },
  lopDeduction: { type: Number, default: 0, min: 0 },

  grossPay: { type: Number, required: true, min: 0 },
  roundPay: { type: Number, required: true, min: 0 },
  paid: { type: Number, default: 0, min: 0 },
  balance: { type: Number, default: 0 },

  // Deficit tracking for when deductions exceed gross earnings
  isDeficit: { type: Boolean, default: false, index: true },
  deficitAmount: { type: Number, default: 0, min: 0 },

  status: {
    type: String,
    enum: ["DRAFT", "CALCULATED", "APPROVED", "PARTIALLY_PAID", "PAID", "LOCKED"],
    default: "DRAFT",
    index: true
  },

  createdBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null }
}, {
  timestamps: true,
  versionKey: false,
  collection: "salaryrecords",
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

SalaryRecordSchema.virtual("totalDeductions").get(function () {
  return (
    (this.totalComponentDeductions || 0) +
    (this.advanceTakenInPresentMonth || 0) +
    (this.shortageDeduction || 0) +
    (this.wastageDeduction || 0) +
    (this.employeePurchaseDeduction || 0) +
    (this.loanEmi || 0) +
    (this.otherDeductions || 0) +
    (this.lopDeduction || 0)
  );
});

const { getTodayDateString } = require("../../../utils/helpers/dateUtils");

SalaryRecordSchema.virtual("isMidMonthPreview").get(function () {
  if (!this.payrollYear || !this.payrollMonth) return false;
  if (["APPROVED", "PARTIALLY_PAID", "PAID", "LOCKED"].includes(this.status)) return false;
  const days = new Date(Date.UTC(this.payrollYear, this.payrollMonth, 0)).getUTCDate();
  const endDateStr = `${this.payrollYear}-${String(this.payrollMonth).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
  const calcDateStr = getTodayDateString(this.calculatedAt || this.updatedAt || this.createdAt || new Date());
  return calcDateStr <= endDateStr;
});

SalaryRecordSchema.index({ employeeId: 1, payrollYear: 1, payrollMonth: 1 }, { unique: true });
SalaryRecordSchema.index({ salaryRunId: 1, branchId: 1 });

module.exports = mongoose.models.SalaryRecord || mongoose.model("SalaryRecord", SalaryRecordSchema);
