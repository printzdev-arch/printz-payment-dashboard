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
      default: () => new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default Net 15
    },
    paymentTerms: {
      type: String,
      default: "NET_15",
    },
    placeOfSupply: {
      type: String,
      default: "",
    },
    isInterState: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
    additionalCharges: {
      type: [additionalChargeSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
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
    totalTax: {
      type: Number,
      default: 0,
    },
    roundingAdjustment: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    advancePaid: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    varianceReason: {
      type: String,
      default: null,
    },
    varianceApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    varianceApprovedAt: {
      type: Date,
      default: null,
    },
    approvalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommonApproval",
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
