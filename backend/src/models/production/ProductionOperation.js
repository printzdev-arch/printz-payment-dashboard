const mongoose = require("mongoose");

const productionOperationSchema = new mongoose.Schema(
  {
    productionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
      required: [true, "Production Order ID is required"],
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    operationCode: {
      type: String,
      required: [true, "Operation code is required"],
      trim: true,
      index: true,
    },
    operationName: {
      type: String,
      default: "",
    },
    sequenceNo: {
      type: Number,
      required: [true, "Sequence number is required"],
      index: true,
    },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Printer",
      default: null,
      index: true,
    },
    assignedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    plannedQty: {
      type: Number,
      default: 0,
      min: [0, "Planned quantity cannot be negative"],
    },
    inputQty: {
      type: Number,
      default: 0,
      min: [0, "Input quantity cannot be negative"],
    },
    outputQty: {
      type: Number,
      default: 0,
      min: [0, "Output quantity cannot be negative"],
    },
    wastageQty: {
      type: Number,
      default: 0,
      min: [0, "Wastage quantity cannot be negative"],
    },
    completedQty: {
      type: Number,
      default: 0,
      min: [0, "Completed quantity cannot be negative"],
    },
    status: {
      type: String,
      enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"],
      default: "PENDING",
      index: true,
    },
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
    isRework: {
      type: Boolean,
      default: false,
    },
    isReprint: {
      type: Boolean,
      default: false,
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
    consumptionRecords: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem" },
        itemName: String,
        quantity: Number,
        unit: { type: String, default: "UNIT" },
        consumptionType: String,
        consumedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
    strictPopulate: false,
  }
);

productionOperationSchema.index({ productionOrderId: 1, sequenceNo: 1 });
productionOperationSchema.index({ assignedEmployeeId: 1, status: 1 });
productionOperationSchema.index({ operationCode: 1, status: 1 });
productionOperationSchema.index({ branchId: 1, status: 1 });

const ProductionOperation = mongoose.model(
  "ProductionOperation",
  productionOperationSchema,
  "productionOperations"
);


// === INJECTED REPOSITORY STATICS ===

productionOperationSchema.statics.findAll = async function (query = {}) {
  const filter = {};
  if (query.productionOrderId) filter.productionOrderId = query.productionOrderId;
  if (query.status) filter.status = query.status;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.branchId) filter.branchId = query.branchId;

  return this.find(filter)
    .populate("assignedTo", "name email role")
    .populate("machineId", "printerName model")
    .sort({ sequenceNumber: 1 });
};

productionOperationSchema.statics.findByProductionOrder = async function (productionOrderId) {
  return this.find({ productionOrderId })
    .populate("assignedTo", "name email role")
    .populate("machineId", "printerName model")
    .sort({ sequenceNumber: 1 });
};

productionOperationSchema.statics.findByProductionOrders = async function (productionOrderIds = []) {
  if (!productionOrderIds.length) return [];
  return this.find({ productionOrderId: { $in: productionOrderIds } })
    .populate("assignedTo", "name email role")
    .populate("machineId", "printerName model")
    .sort({ sequenceNumber: 1 })
    .lean();
};

productionOperationSchema.statics.findPriorOperations = async function (productionOrderId, sequenceNumber) {
  return this.find({
    productionOrderId,
    sequenceNumber: { $lt: sequenceNumber },
  }).sort({ sequenceNumber: 1 });
};

productionOperationSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};


if (typeof productionOperationSchema !== "undefined" && typeof ProductionOperation !== "undefined" && productionOperationSchema.statics) {
  Object.assign(ProductionOperation, productionOperationSchema.statics);
}

module.exports = ProductionOperation;
