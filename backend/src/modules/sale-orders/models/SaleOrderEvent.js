const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

/**
 * Append-only timeline of every status change / action on an order.
 * Collection: saleOrderEvents
 */
const saleOrderEventSchema = new mongoose.Schema(
  {
    orderId: { type: ObjectId, ref: "SaleOrder", required: true },
    action: { type: String, required: true, trim: true, uppercase: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, required: true },
    actorId: { type: ObjectId, ref: "User", default: null },
    actorRole: { type: String, required: true, trim: true },
    branchId: { type: ObjectId, ref: "Branch", required: true },
    notes: { type: String, default: "", trim: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "saleOrderEvents",
  }
);

saleOrderEventSchema.index({ orderId: 1, createdAt: 1 });

module.exports =
  mongoose.models.SaleOrderEvent ||
  mongoose.model("SaleOrderEvent", saleOrderEventSchema);
