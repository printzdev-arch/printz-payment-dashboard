const mongoose = require("mongoose");

const StructureComponentSchema = new mongoose.Schema({
  componentId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryComponent", required: true },
  amount: { type: Number, min: 0, default: 0 },
  percentage: { type: Number, min: 0, default: 0 },
  isEnabled: { type: Boolean, default: true }
}, { _id: false });

const EmployeeSalaryStructureSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.Mixed, ref: "Employee", required: true, index: true },
  branchId: { type: mongoose.Schema.Types.Mixed, ref: "Branch", required: true, index: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
  monthlySalary: { type: Number, min: 0, required: true },
  components: { type: [StructureComponentSchema], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  remarks: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
}, {
  timestamps: true,
  versionKey: false,
  collection: "employeesalarystructures",
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

EmployeeSalaryStructureSchema.index({ employeeId: 1, effectiveFrom: -1 });
module.exports = mongoose.models.EmployeeSalaryStructure || mongoose.model("EmployeeSalaryStructure", EmployeeSalaryStructureSchema);
