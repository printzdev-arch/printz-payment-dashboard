const mongoose = require("mongoose");

const saleReceiptSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Customer",
      default: null,
      index: true,
    },
    customerSnapshot: {
      name: { type: String, default: null },
      mobile: { type: String, default: null },
      email: { type: String, default: null },
      gstin: { type: String, default: null },
      address: { type: String, default: null },
    },
    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID", "CREDIT"],
      default: "UNPAID",
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK", "CREDIT", "SPLIT", null],
      default: "CASH",
    },
    splitPayments: {
      type: [
        {
          mode: { type: String, enum: ["CASH", "UPI", "CARD", "BANK", "CREDIT"] },
          amount: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    paymentReference: {
      type: String,
      default: null,
      trim: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "HELD", "COMPLETED", "VOID"],
      default: "DRAFT",
      index: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    managerApproval: {
      isApproved: { type: Boolean, default: false },
      approvedBy: { type: String, default: null },
      approvedAt: { type: Date, default: null },
      reason: { type: String, default: null },
    },
    remarks: {
      type: String,
      default: null,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      index: { unique: true, sparse: true },
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true,
    },
    voidReason: {
      type: String,
      default: null,
      trim: true,
    },
    voidedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "saleReceipts",
  }
);

saleReceiptSchema.index({ branchId: 1, saleDate: -1 });
saleReceiptSchema.index({ customerId: 1, saleDate: -1 });
saleReceiptSchema.index({ status: 1, paymentStatus: 1 });


// === INJECTED REPOSITORY STATICS ===

saleReceiptSchema.statics.findAll = async function (query = {}, { page = 1, limit = 20, sort = { createdAt: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("branchId", "name code")
      .populate("createdBy", "name username email")
      .populate("customerId", "name mobile customerCode")
      .lean(),
    this.countDocuments(query),
  ]);
  return { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 };
};

saleReceiptSchema.statics.findByReceiptNo = async function (receiptNo) {
  if (!receiptNo) return null;
  return this.findOne({ receiptNo: String(receiptNo).trim() })
    .populate("branchId", "name code")
    .populate("createdBy", "name username email")
    .populate("customerId", "name mobile customerCode");
};

saleReceiptSchema.statics.findByIdempotencyKey = async function (idempotencyKey) {
  if (!idempotencyKey) return null;
  return this.findOne({ idempotencyKey });
};

saleReceiptSchema.statics.update = async function (id, data) {
  return this.findByIdAndUpdate(id, { $set: data }, { new: true });
};

saleReceiptSchema.statics.delete = async function (id) {
  return this.findByIdAndDelete(id);
};


module.exports = mongoose.models.SaleReceipt || mongoose.model("SaleReceipt", saleReceiptSchema);
