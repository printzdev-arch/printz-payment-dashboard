const mongoose = require("mongoose");

const productionOrderSchema = new mongoose.Schema(
  {
    productionNo: {
      type: String,
      required: [true, "Production number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: [true, "Job Order ID is required"],
      index: true,
    },
    jobItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["UNASSIGNED", "PLANNED", "IN_PROGRESS", "ON_HOLD", "QC", "QC_PASSED", "QC_ISSUE", "COMPLETED", "CANCELLED"],
      default: "UNASSIGNED",
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT", "Low", "Normal", "High", "Urgent", "Rush", "RUSH"],
      default: "NORMAL",
      uppercase: true,
      index: true,
    },
    plannedQty: {
      type: Number,
      default: 0,
    },
    actualQty: {
      type: Number,
      default: 0,
    },
    plannedStart: {
      type: Date,
      default: null,
    },
    actualStart: {
      type: Date,
      default: null,
    },
    actualEnd: {
      type: Date,
      default: null,
    },
    machine: {
      type: String,
      default: null,
    },
    assignedEmployees: [
      {
        type: String,
      },
    ],
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Printer",
      default: null,
    },
    assignedEmployeeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    approvedSample: {
      fileUrl: { type: String, default: null },
      thumbnailUrl: { type: String, default: null },
      customerComments: { type: String, default: "" },
      approvedAt: { type: Date, default: null },
    },
    cycleNo: {
      type: Number,
      default: 0,
      index: true,
    },
    cycleType: {
      type: String,
      enum: ["ORIGINAL", "REPRINT", "REWORK"],
      default: "ORIGINAL",
      index: true,
    },
    parentProductionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
      default: null,
      index: true,
    },
    reprintRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReprintRequest",
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
    holdReason: {
      type: String,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strictPopulate: false,
  }
);

productionOrderSchema.index({ jobOrderId: 1, status: 1 });
productionOrderSchema.index({ branchId: 1, status: 1, createdAt: -1 });

const ProductionOrder = mongoose.model(
  "ProductionOrder",
  productionOrderSchema,
  "productionOrders"
);


// === INJECTED REPOSITORY STATICS ===

productionOrderSchema.statics.findAll = async function (query = {}) {
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (query.status) {
    filter.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
  }
  if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
  if (query.machineId) filter.machineId = query.machineId;
  if (query.priority) filter.priority = query.priority;

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.find(filter)
      .populate("jobOrderId", "jobNo title customerName customerSnapshot dueDate priority stage currentStage")
      .populate("branchId", "name code")
      .populate("machineId", "printerName model")
      .populate("assignedEmployeeIds", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

productionOrderSchema.statics.findActiveOrders = async function (branchId = null) {
  const orderQuery = {
    status: { $in: ["PLANNED", "IN_PROGRESS"] },
  };
  if (branchId) orderQuery.branchId = branchId;

  return this.find(orderQuery)
    .select("_id jobOrderId branchId priority status plannedStart approvedSample")
    .populate("jobOrderId", "jobNo title customerName customerPhone dueDate priority stage")
    .populate("branchId", "name code")
    .lean();
};

productionOrderSchema.statics.findByIdWithDetails = async function (id) {
  return this.findById(id)
    .populate("jobOrderId")
    .populate("branchId")
    .populate("machineId")
    .populate("assignedEmployeeIds");
};

productionOrderSchema.statics.countToday = async function (branchId = null) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  };
  if (branchId) query.branchId = branchId;

  return this.countDocuments(query);
};

productionOrderSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};



productionOrderSchema.statics.save = async function(doc) {
  if (doc && typeof doc.save === 'function') {
    return doc.save();
  }
  const item = new this(doc);
  return item.save();
};

if (typeof productionOrderSchema !== "undefined" && typeof ProductionOrder !== "undefined" && productionOrderSchema.statics) {
  Object.assign(ProductionOrder, productionOrderSchema.statics);
}

module.exports = ProductionOrder;
