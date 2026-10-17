const mongoose = require("mongoose");
const { TRANSFER_STATUS } = require("../../utils/constants/productOrderConstants");

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


// === INJECTED REPOSITORY STATICS ===

stockTransferSchema.statics.findAll = async function (query = {}, { page = 1, limit = 20, sort = { createdAt: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .populate("dispatchedBy", "name username email")
      .populate("receivedBy", "name username email")
      .lean(),
    this.countDocuments(query),
  ]);
  return { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 };
};

stockTransferSchema.statics.findByTransferNo = async function (transferNo) {
  return this.findOne({ transferNo: String(transferNo).trim() })
    .populate("fromBranchId", "name code")
    .populate("toBranchId", "name code")
    .populate("dispatchedBy", "name username email")
    .populate("receivedBy", "name username email");
};

stockTransferSchema.statics.findByProductOrderId = async function (productOrderId) {
  return this.findOne({ productOrderId })
    .populate("fromBranchId", "name code")
    .populate("toBranchId", "name code");
};

stockTransferSchema.statics.update = async function (id, data) {
  return this.findByIdAndUpdate(id, { $set: data }, { new: true });
};


module.exports =
  mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);
