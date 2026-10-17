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


// === INJECTED REPOSITORY STATICS ===

productOrderItemSchema.statics.createMany = async function (items, session = null) {
  return this.insertMany(items, { session });
};

productOrderItemSchema.statics.findByOrderId = async function (orderId) {
  return this.find({ orderId }).populate("itemId").lean();
};

productOrderItemSchema.statics.deleteByOrderId = async function (orderId, session = null) {
  return this.deleteMany({ orderId }, { session });
};

productOrderItemSchema.statics.updateItemQuantities = async function (orderId, itemId, quantities = {}) {
  return this.findOneAndUpdate(
    { orderId, itemId },
    { $set: quantities },
    { new: true }
  );
};


module.exports =
  mongoose.models.ProductOrderItem ||
  mongoose.model("ProductOrderItem", productOrderItemSchema);
