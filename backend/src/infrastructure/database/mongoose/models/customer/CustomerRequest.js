const mongoose = require("mongoose");

const customerRequestItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      default: "Print Job Item",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    unit: {
      type: String,
      default: "PCS",
      trim: true,
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

const customerRequestAttachmentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      default: "",
      trim: true,
    },
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileCategory: {
      type: String,
      default: "REFERENCE",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const customerRequestSchema = new mongoose.Schema(
  {
    requestNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, "Customer phone number is required"],
      trim: true,
      index: true,
    },
    customerEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    customerCompany: {
      type: String,
      default: "",
      trim: true,
    },
    customerAddress: {
      type: String,
      default: "",
      trim: true,
    },
    customerGstin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      default: "Print Job Enquiry",
      trim: true,
    },
    category: {
      type: String,
      default: "GENERAL",
      trim: true,
    },
    source: {
      type: String,
      enum: ["QR_CODE", "WEB_PORTAL", "WHATSAPP", "PHONE", "WALK_IN", "MANUAL"],
      default: "QR_CODE",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "UNDER_REVIEW",
        "ESTIMATED",
        "CONVERTED_TO_JOB",
        "REJECTED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    dueDate: {
      type: Date,
      default: null,
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
    items: {
      type: [customerRequestItemSchema],
      default: [],
    },
    attachments: {
      type: [customerRequestAttachmentSchema],
      default: [],
    },
    convertedJobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      default: null,
      index: true,
    },
    convertedEstimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Estimate",
      default: null,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

customerRequestSchema.index({ branchId: 1, status: 1 });
customerRequestSchema.index({ customerPhone: 1, createdAt: -1 });

const CustomerRequest =
  mongoose.models.CustomerRequest ||
  mongoose.model("CustomerRequest", customerRequestSchema, "customerRequests");

module.exports = CustomerRequest;
