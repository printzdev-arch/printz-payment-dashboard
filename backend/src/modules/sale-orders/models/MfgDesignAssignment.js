const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const candidateSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "User" },
    availability: { type: String },
    activeOrders: { type: Number },
    skipped: { type: Boolean, default: false },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * Assignment history of an order to manufacturing-unit designers.
 * Collection: mfgDesignAssignments
 */
const mfgDesignAssignmentSchema = new mongoose.Schema(
  {
    orderId: { type: ObjectId, ref: "SaleOrder", required: true },
    designerUserId: { type: ObjectId, ref: "User", required: true },
    method: { type: String, enum: ["AUTO", "MANUAL", "REASSIGN"], required: true },
    assignedBy: { type: ObjectId, ref: "User", default: null },
    assignedAt: { type: Date, required: true },
    seenAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
    status: { type: String, enum: ["ACTIVE", "COMPLETED", "REASSIGNED"], default: "ACTIVE", required: true },
    reason: { type: String, default: "", trim: true },
    selectionSnapshot: {
      type: new mongoose.Schema({ candidates: { type: [candidateSchema], default: [] } }, { _id: false }),
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "mfgDesignAssignments",
  }
);

mfgDesignAssignmentSchema.index({ orderId: 1, assignedAt: -1 });
mfgDesignAssignmentSchema.index({ designerUserId: 1, status: 1 });

module.exports =
  mongoose.models.MfgDesignAssignment ||
  mongoose.model("MfgDesignAssignment", mfgDesignAssignmentSchema);
