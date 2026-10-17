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
      enum: ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"],
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
        "DELIVERED",
        "INVOICED",
        "COMPLETED",
        "CLOSED",
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
        "INVOICED",
        "COMPLETED",
        "SETTLED",
        "CLOSED",
        "ON_HOLD",
        "CANCELLED",
        "ACTIVE",
        "ESTIMATE_ACCEPTED",
        "PRODUCTION_PLANNING",
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
    designerName: {
      type: String,
      default: "",
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
    discountPercent: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 8,
    },
    approvedPricing: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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
    customerEmail: {
      type: String,
      default: "",
    },
    branchName: {
      type: String,
      default: "",
    },
    specialInstructions: {
      type: String,
      default: "",
    },
    deliveryMethod: {
      type: String,
      default: "",
    },
    referenceNo: {
      type: String,
      default: "",
    },
    specs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    finishingServices: {
      type: Array,
      default: [],
    },
    additionalServices: {
      type: Array,
      default: [],
    },
    attachments: {
      type: Array,
      default: [],
    },
    advancePaid: {
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
    closureStatus: {
      type: String,
      default: "",
    },
    feedback: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: null,
    },
    designStatus: {
      type: String,
      default: "UNASSIGNED",
    },
    designProofUrl: {
      type: String,
      default: "",
    },
    designRejectionReason: {
      type: String,
      default: "",
    },
    isRevisionStarted: {
      type: Boolean,
      default: false,
    },
    revisionStartedAt: {
      type: Date,
      default: null,
    },
    rejectedSampleUrl: {
      type: String,
      default: "",
    },
    sampleRejectedAt: {
      type: Date,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closureRemarks: {
      type: String,
      default: "",
    },
    invoiceNo: {
      type: String,
      default: "",
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strictPopulate: false,
  }
);

jobOrderSchema.index({ branchId: 1, currentStage: 1 });
jobOrderSchema.index({ branchId: 1, status: 1 });
jobOrderSchema.index({ idempotencyKey: 1 }, { sparse: true });

const JobOrder = mongoose.models.JobOrder || mongoose.model("JobOrder", jobOrderSchema, "jobOrders");


// === INJECTED REPOSITORY STATICS ===

jobOrderSchema.statics.findAll = async function (query = {}) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = { ...query };
  delete filter.page;
  delete filter.limit;
  delete filter.sort;

  if (typeof filter.currentStage === "string" && filter.currentStage.includes(",")) {
    filter.currentStage = { $in: filter.currentStage.split(",").map((s) => s.trim()) };
  }
  if (typeof filter.status === "string" && filter.status.includes(",")) {
    filter.status = { $in: filter.status.split(",").map((s) => s.trim()) };
  }
  if (typeof filter.stage === "string" && filter.stage.includes(",")) {
    filter.stage = { $in: filter.stage.split(",").map((s) => s.trim()) };
  }

  const [items, total] = await Promise.all([
    this.find(filter)
      .populate("branchId", "name code")
      .populate("designerId", "name email role")
      .populate("createdBy", "name email")
      .sort(query.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

jobOrderSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};

jobOrderSchema.statics.delete = async function (id) {
  return this.findByIdAndDelete(id);
};

jobOrderSchema.statics.findByIdempotencyKey = async function (idempotencyKey) {
  if (!idempotencyKey) return null;
  return this.findOne({ idempotencyKey })
    .populate("branchId", "name code")
    .populate("designerId", "name email role")
    .populate("createdBy", "name email");
};

jobOrderSchema.statics.updateStage = async function (jobOrderId, newStage, newStatus = null) {
  if (!jobOrderId) return null;
  const update = { stage: newStage };
  if (newStatus) update.status = newStatus;
  return this.findByIdAndUpdate(jobOrderId, { $set: update }, { new: true });
};


if (typeof jobOrderSchema !== "undefined" && typeof JobOrder !== "undefined" && jobOrderSchema.statics) {
  Object.assign(JobOrder, jobOrderSchema.statics);
}

module.exports = JobOrder;
