const mongoose = require("mongoose");
const { jobItemSchema } = require("./JobItem");

const jobOrderSchema = new mongoose.Schema(
  {
    jobNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    customerSnapshot: {
      name: { type: String, default: "Walk-in Customer" },
      mobile: { type: String, default: "" },
      email: { type: String, default: "" },
      company: { type: String, default: "" },
      address: { type: String, default: "" },
      gstin: { type: String, default: "" },
    },
    customerName: {
      type: String,
      default: "Walk-in Customer",
    },
    customerPhone: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "Print Job",
    },
    orderDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
      index: true,
    },
    jobType: {
      type: String,
      default: "PRINT_JOB",
    },
    quantity: {
      type: Number,
      default: 1,
    },
    customerRequirements: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    currentStage: {
      type: String,
      enum: [
        "ENQUIRY",
        "ESTIMATION",
        "ESTIMATE_APPROVAL",
        "DESIGN_QUEUE",
        "DESIGN_ASSIGNED",
        "DESIGN_IN_PROGRESS",
        "SAMPLE_APPROVAL",
        "REVISION",
        "PRODUCTION_PLANNING",
        "PRINTING",
        "FINISHING",
        "PACKING",
        "QC",
        "REWORK",
        "REPRINT",
        "READY",
        "DELIVERY",
        "COMPLETED",
      ],
      default: "ENQUIRY",
      index: true,
    },
    stage: {
      type: String,
      default: "ENQUIRY",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "ESTIMATION",
        "DESIGN",
        "APPROVAL",
        "PRODUCTION",
        "PACKING",
        "QC",
        "READY",
        "DELIVERED",
        "ON_HOLD",
        "CANCELLED",
        "ACTIVE",
      ],
      default: "DRAFT",
      index: true,
    },
    estimationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "UNPAID", "PARTIAL", "PAID", "CREDIT"],
      default: "PENDING",
      index: true,
    },
    designerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    items: [jobItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    estimatedPrice: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    idempotencyKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

jobOrderSchema.index({ branchId: 1, currentStage: 1 });
jobOrderSchema.index({ branchId: 1, status: 1 });
jobOrderSchema.index({ idempotencyKey: 1 }, { sparse: true });

const JobOrder = mongoose.models.JobOrder || mongoose.model("JobOrder", jobOrderSchema, "jobOrders");

module.exports = JobOrder;
