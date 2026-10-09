const mongoose = require("mongoose");
const { ORDER_STATUS } = require("../../../../../shared/constants/productOrderConstants");

const productOrderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    requestingBranchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.DRAFT,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    dispatchedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
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
    collection: "productOrders",
  }
);

productOrderSchema.index({ requestingBranchId: 1, status: 1 });
productOrderSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.ProductOrder || mongoose.model("ProductOrder", productOrderSchema);
