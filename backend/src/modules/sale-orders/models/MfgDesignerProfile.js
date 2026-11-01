const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

/**
 * Availability and workload of each manufacturing-unit designer. Drives auto-assignment.
 * Collection: mfgDesignerProfiles
 */
const mfgDesignerProfileSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true },
    employeeId: { type: ObjectId, ref: "Employee", default: null },
    manufacturingUnitId: { type: ObjectId, ref: "Branch", required: true },
    displayName: { type: String, required: true, trim: true },
    availability: {
      type: String,
      enum: ["AVAILABLE", "BUSY", "ON_BREAK", "OFF_DUTY"],
      default: "OFF_DUTY",
      required: true,
    },
    maxActiveOrders: { type: Number, default: 5, min: 1, required: true },
    activeOrders: { type: Number, default: 0, min: 0, required: true },
    skills: { type: [String], default: [] },
    lastAssignedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "mfgDesignerProfiles",
  }
);

mfgDesignerProfileSchema.index({ userId: 1 }, { unique: true });
mfgDesignerProfileSchema.index({ manufacturingUnitId: 1, isActive: 1, availability: 1 });

module.exports =
  mongoose.models.MfgDesignerProfile ||
  mongoose.model("MfgDesignerProfile", mfgDesignerProfileSchema);
