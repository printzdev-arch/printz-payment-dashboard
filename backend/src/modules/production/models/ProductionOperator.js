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

module.exports = mongoose.model("ProductionOperator", productionOperatorSchema, "productionOperators");
