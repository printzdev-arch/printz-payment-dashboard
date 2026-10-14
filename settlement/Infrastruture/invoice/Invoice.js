const mongoose = require("mongoose");
const { INVOICE_STATUS, INVOICE_TYPE } = require("../../../../../shared/constants/invoice");

const invoiceItemSchema = new mongoose.Schema(
  {
    jobOrderItemId: { type: mongoose.Schema.Types.Mixed, default: null },
    estimateItemId: { type: mongoose.Schema.Types.Mixed, default: null },
    itemId: { type: mongoose.Schema.Types.Mixed, default: null },
    itemCode: { type: String, default: "" },
    itemName: { type: String, required: true },
    description: { type: String, default: "" },
    unit: { type: String, default: "PCS" },
    quantity: { type: Number, required: true, min: 0 },
    previouslyInvoicedQuantity: { type: Number, default: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: ["FIXED", "PERCENTAGE"], default: "FIXED" },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: true }
);

const additionalChargeSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      default: null,
      trim: true,
    },
    invoiceType: {
      type: String,
      enum: Object.values(INVOICE_TYPE),
      default: INVOICE_TYPE.TAX_INVOICE,
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.DRAFT,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
      index: true,
    },
    jobNo: {
      type: String,
      default: "",
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Customer",
      default: null,
      index: true,
    },
    customerSnapshot: {
      name: { type: String, default: "Walk-in Customer" },
      mobile: { type: String, default: "" },
      email: { type: String, default: "" },
      company: { type: String, default: "" },
      gstin: { type: String, default: "" },
      address: { type: String, default: "" },
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    branchSnapshot: {
      name: { type: String, default: "" },
      code: { type: String, default: "" },
      address: { type: String, default: "" },
    },
    estimateId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    deliveryOrderId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "DeliveryOrder",
      default: null,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    currency: {
      type: String,
      default: "INR",
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    discountTotal: {
      type: Number,
      default: 0,
    },
    additionalChargesTotal: {
      type: Number,
      default: 0,
    },
    additionalCharges: [additionalChargeSchema],
    taxableAmount: {
      type: Number,
      default: 0,
    },
    cgstTotal: {
      type: Number,
      default: 0,
    },
    sgstTotal: {
      type: Number,
      default: 0,
    },
    igstTotal: {
      type: Number,
      default: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    advanceApplied: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    creditAdjustedAmount: {
      type: Number,
      default: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID"],
      default: "UNPAID",
      index: true,
    },
    estimateAmountSnapshot: {
      type: Number,
      default: 0,
    },
    varianceAmount: {
      type: Number,
      default: 0,
    },
    variancePercentage: {
      type: Number,
      default: 0,
    },
    approvalRequired: {
      type: Boolean,
      default: false,
      index: true,
    },
    approvalId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "CommonApproval",
      default: null,
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
    approvalRemarks: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "invoices",
  }
);

// Indexes
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ branchId: 1, status: 1 });
invoiceSchema.index({ jobOrderId: 1, status: 1 });
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ invoiceDate: -1 });

const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
