const mongoose = require("mongoose");
const { TRANSFER_STATUS } = require("../../../../../shared/constants/productOrderConstants");

const stockTransferItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
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
  { _id: false }
);

const stockTransferSchema = new mongoose.Schema(
  {
    transferNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    productOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductOrder",
      required: true,
      index: true,
    },
    fromBranchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      required: true,
      index: true,
    },
    toBranchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TRANSFER_STATUS),
      default: TRANSFER_STATUS.APPROVED,
      index: true,
    },
    items: {
      type: [stockTransferItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Stock transfer must contain at least one line item",
      },
    },
    requestedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
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
    collection: "stockTransfers",
  }
);

stockTransferSchema.index({ fromBranchId: 1, status: 1 });
stockTransferSchema.index({ toBranchId: 1, status: 1 });

module.exports =
  mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);
