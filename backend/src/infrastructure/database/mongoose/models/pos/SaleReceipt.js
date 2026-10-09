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
      enum: ["CASH", "UPI", "CARD", "BANK", "CREDIT", null],
      default: "CASH",
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
      enum: ["DRAFT", "COMPLETED", "VOID"],
      default: "DRAFT",
      index: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
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

module.exports = mongoose.models.SaleReceipt || mongoose.model("SaleReceipt", saleReceiptSchema);
