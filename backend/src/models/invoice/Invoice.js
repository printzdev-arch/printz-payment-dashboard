const mongoose = require("mongoose");
const { INVOICE_STATUS, INVOICE_TYPE } = require("../../utils/constants/invoice");

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
    discountTotal: {
      type: Number,
      default: 0,
    },
    additionalChargesTotal: {
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
    taxTotal: {
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
    advanceApplied: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    paidAmount: {
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

invoiceSchema.pre("save", function (next) {
  if (this.advanceApplied !== undefined && (this.advancePaid === undefined || this.advancePaid === 0)) {
    this.advancePaid = this.advanceApplied;
  } else if (this.advancePaid !== undefined && (this.advanceApplied === undefined || this.advanceApplied === 0)) {
    this.advanceApplied = this.advancePaid;
  }
  if (this.paidAmount !== undefined && (this.amountPaid === undefined || this.amountPaid === 0)) {
    this.amountPaid = this.paidAmount;
  } else if (this.amountPaid !== undefined && (this.paidAmount === undefined || this.paidAmount === 0)) {
    this.paidAmount = this.amountPaid;
  }
  if (this.totalDiscount !== undefined && (this.discountTotal === undefined || this.discountTotal === 0)) {
    this.discountTotal = this.totalDiscount;
  } else if (this.discountTotal !== undefined && (this.totalDiscount === undefined || this.totalDiscount === 0)) {
    this.totalDiscount = this.discountTotal;
  }
  if (this.totalTax !== undefined && (this.taxTotal === undefined || this.taxTotal === 0)) {
    this.taxTotal = this.totalTax;
  } else if (this.taxTotal !== undefined && (this.totalTax === undefined || this.totalTax === 0)) {
    this.totalTax = this.taxTotal;
  }
  next();
});

invoiceSchema.pre("validate", function (next) {
  if (this.invoiceNumber === null || this.invoiceNumber === "") {
    this.invoiceNumber = undefined;
  }
  next();
});

// Indexes
invoiceSchema.index(
  { invoiceNumber: 1 },
  { unique: true, sparse: true, partialFilterExpression: { invoiceNumber: { $type: "string" } } }
);
invoiceSchema.index({ branchId: 1, status: 1 });
invoiceSchema.index({ jobOrderId: 1, status: 1 });
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ invoiceDate: -1 });

const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);


// === INJECTED REPOSITORY STATICS ===

invoiceSchema.statics.findByInvoiceNumber = async function (invoiceNumber) {
  if (!invoiceNumber) return null;
  return this.findOne({ invoiceNumber, isDeleted: { $ne: true } });
};

invoiceSchema.statics.findByJobOrderId = async function (jobOrderId) {
  if (!mongoose.Types.ObjectId.isValid(jobOrderId)) return [];
  return this.find({ jobOrderId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
};

invoiceSchema.statics.findActiveByJobOrderId = async function (jobOrderId) {
  if (!mongoose.Types.ObjectId.isValid(jobOrderId)) return null;
  return this.findOne({
    jobOrderId,
    status: { $ne: "CANCELLED" },
    isDeleted: { $ne: true },
  }).sort({ createdAt: -1 });
};

invoiceSchema.statics.findAll = async function (filter = {}, pagination = { page: 1, limit: 20 }) {
  const query = { isDeleted: { $ne: true } };

  if (filter.status) query.status = filter.status;
  if (filter.branchId) query.branchId = filter.branchId;
  if (filter.branchIds && Array.isArray(filter.branchIds) && filter.branchIds.length > 0) {
    query.branchId = { $in: filter.branchIds };
  }
  if (filter.customerId) query.customerId = filter.customerId;
  if (filter.jobOrderId) query.jobOrderId = filter.jobOrderId;
  if (filter.search) {
    const regex = new RegExp(filter.search, "i");
    query.$or = [
      { invoiceNumber: regex },
      { jobNo: regex },
      { "customerSnapshot.name": regex },
      { "customerSnapshot.mobile": regex },
    ];
  }
  if (filter.startDate && filter.endDate) {
    query.invoiceDate = {
      $gte: new Date(filter.startDate),
      $lte: new Date(filter.endDate),
    };
  }

  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    this.find(query)
      .populate("jobOrderId", "jobNo title status currentStage")
      .populate("branchId", "name code address")
      .populate("createdBy", "username email employeeCode")
      .populate("finalizedBy", "username email employeeCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query),
  ]);

  return {
    invoices,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

invoiceSchema.statics.updateById = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};


Object.assign(Invoice, invoiceSchema.statics);

module.exports = Invoice;
