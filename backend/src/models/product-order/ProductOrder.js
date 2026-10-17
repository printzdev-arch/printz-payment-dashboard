const mongoose = require("mongoose");
const { ORDER_STATUS } = require("../../utils/constants/productOrderConstants");

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


// === INJECTED REPOSITORY STATICS ===

productOrderSchema.statics.findAll = async function (query = {}, { page = 1, limit = 20, sort = { createdAt: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("requestingBranchId", "name code")
      .populate("fulfillingBranchId", "name code")
      .populate("requestedBy", "name username email")
      .lean(),
    this.countDocuments(query),
  ]);
  return { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 };
};

productOrderSchema.statics.findByOrderNo = async function (orderNo) {
  return this.findOne({ orderNo: String(orderNo).trim() })
    .populate("requestingBranchId", "name code")
    .populate("fulfillingBranchId", "name code")
    .populate("requestedBy", "name username email");
};

productOrderSchema.statics.update = async function (id, data) {
  return this.findByIdAndUpdate(id, { $set: data }, { new: true });
};

productOrderSchema.statics.delete = async function (id) {
  return this.findByIdAndDelete(id);
};


module.exports =
  mongoose.models.ProductOrder || mongoose.model("ProductOrder", productOrderSchema);
