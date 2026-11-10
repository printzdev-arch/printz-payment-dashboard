const mongoose = require("mongoose");

/**
 * A production operator: a person who runs operations on the shop floor.
 * Operators do not log in; the manager assigns them to operations.
 * Machines are NOT stored here (they come from the existing Printer collection).
 */
const productionOperatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Operator name is required"],
      trim: true,
      minlength: [2, "Operator name must be at least 2 characters"],
    },
    phone: { type: String, trim: true, default: "" },
    // The Employee this operator is. Attendance and salary are kept on the Employee,
    // so linking makes the operator appear in payroll. Optional so older operators still work.
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    // What the operator does, e.g. "Press operator", "Finishing", "Packing"
    skill: { type: String, trim: true, default: "" },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    // Availability: an unavailable operator cannot be assigned to new work
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

productionOperatorSchema.index({ name: 1 });
// One employee can be linked to at most one operator
productionOperatorSchema.index(
  { employeeId: 1 },
  { unique: true, partialFilterExpression: { employeeId: { $type: "objectId" } } }
);

module.exports = mongoose.model("ProductionOperator", productionOperatorSchema, "productionOperators");
