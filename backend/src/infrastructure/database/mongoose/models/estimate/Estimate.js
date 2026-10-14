const mongoose = require("mongoose");

const estimateItemSchema = new mongoose.Schema(
  {
    lineNo: {
      type: Number,
      default: 1,
    },
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 1,
      default: 1,
    },
    unit: {
      type: String,
      default: "PCS",
      trim: true,
    },
    unitRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    paperSize: {
      type: String,
      default: "",
      trim: true,
    },
    paperType: {
      type: String,
      default: "",
      trim: true,
    },
    printingType: {
      type: String,
      default: "",
      trim: true,
    },
    colorMode: {
      type: String,
      default: "CMYK",
      trim: true,
    },
    sides: {
      type: String,
      enum: ["SINGLE", "DOUBLE", "FRONT_BACK", "MULTI_PAGE", ""],
      default: "SINGLE",
    },
    finishing: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    customerRequirements: {
      type: String,
      default: "",
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const estimateCustomerSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    mobile: { type: String, default: "" },
    email: { type: String, default: "" },
    company: { type: String, default: "" },
    address: { type: String, default: "" },
    gstin: { type: String, default: "" },
  },
  { _id: false }
);

const estimateSchema = new mongoose.Schema(
  {
    estimateNo: {
      type: String,
      required: [true, "Estimate number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      default: null,
      index: true,
    },
    customerRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerRequest",
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
      index: true,
    },
    customerSnapshot: {
      type: estimateCustomerSnapshotSchema,
      default: () => ({}),
    },
    title: {
      type: String,
      default: "Print Quotation",
      trim: true,
    },
    versionNo: {
      type: Number,
      default: 1,
      min: 1,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "REVISED",
        "EXPIRED",
        "CONVERTED",
      ],
      default: "DRAFT",
      index: true,
    },
    items: {
      type: [estimateItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    termsAndConditions: {
      type: String,
      default: "",
    },
    revisionNotes: {
      type: String,
      default: "",
      trim: true,
    },
    previousEstimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Estimate",
      default: null,
    },
    currentApprovalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EstimateApproval",
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
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

estimateSchema.index({ branchId: 1, status: 1 });
estimateSchema.index({ customerId: 1, createdAt: -1 });
estimateSchema.index({ jobOrderId: 1, versionNo: -1 });

const Estimate =
  mongoose.models.Estimate || mongoose.model("Estimate", estimateSchema, "estimates");

module.exports = Estimate;
