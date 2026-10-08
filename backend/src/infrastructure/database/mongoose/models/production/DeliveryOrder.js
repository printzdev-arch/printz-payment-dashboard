const mongoose = require("mongoose");

const deliveryOrderSchema = new mongoose.Schema(
  {
    deliveryNo: {
      type: String,
      required: [true, "Delivery number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: [true, "Job Order ID is required"],
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      index: true,
    },
    customerId: {
      type: String,
      default: null,
    },
    customerName: {
      type: String,
      default: "",
    },
    deliveryAddress: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["READY", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
      default: "READY",
      index: true,
    },
    packedAt: {
      type: Date,
      default: null,
    },
    packedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deliveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    receivedBy: {
      type: String,
      default: null,
    },
    recipientName: {
      type: String,
      default: null,
    },
    signatureUrl: {
      type: String,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

deliveryOrderSchema.index({ jobOrderId: 1, status: 1 });
deliveryOrderSchema.index({ branchId: 1, status: 1 });

const DeliveryOrder = mongoose.model(
  "DeliveryOrder",
  deliveryOrderSchema,
  "deliveryOrders"
);

module.exports = DeliveryOrder;
