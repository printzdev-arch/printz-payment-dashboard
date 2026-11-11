const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const specificationSchema = new mongoose.Schema(
  {
    paperType: { type: String, default: "", trim: true },
    paperGsm: { type: String, default: "", trim: true },
    size: { type: String, default: "", trim: true },
    material: { type: String, default: "", trim: true },
    colorMode: { type: String, default: "", trim: true },
    sides: { type: String, default: "", trim: true },
    finishing: { type: [String], default: [] },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/**
 * Line items of a sale order.
 * Collection: saleOrderItems
 */
const saleOrderItemSchema = new mongoose.Schema(
  {
    orderId: { type: ObjectId, ref: "SaleOrder", required: true },
    lineNo: { type: Number, required: true, min: 1 },
    productType: { type: String, required: true, trim: true, uppercase: true },
    itemId: { type: ObjectId, ref: "InventoryItem", default: null },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, uppercase: true },
    specification: { type: specificationSchema, default: () => ({}) },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "saleOrderItems",
  }
);

saleOrderItemSchema.index({ orderId: 1, lineNo: 1 }, { unique: true });

module.exports =
  mongoose.models.SaleOrderItem || mongoose.model("SaleOrderItem", saleOrderItemSchema);
