const mongoose = require("mongoose");

const productOrderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductOrder",
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    requestedQty: {
      type: Number,
      required: true,
      min: 0.0001,
    },
    approvedQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    dispatchedQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    receivedQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: "PCS",
      trim: true,
      uppercase: true,
    },
    remarks: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "productOrderItems",
  }
);

productOrderItemSchema.index({ orderId: 1 });

module.exports =
  mongoose.models.ProductOrderItem ||
  mongoose.model("ProductOrderItem", productOrderItemSchema);
