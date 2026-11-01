const mongoose = require("mongoose");
require("../../printers/models/Printer");

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
    // Sequence numbers this operation depends on. Empty = depends on all
    // lower sequence numbers (strict sequential). Allows parallel operations.
    dependsOn: {
      type: [Number],
      default: [],
    },

    // ── Resources ──
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Printer",
      default: null,
      index: true,
    },
    // Display name used until machine/operator pickers send IDs
    machine: {
      type: String,
      default: "",
    },
    assignedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    operatorName: {
      type: String,
      default: "",
    },

    // ── Planning ──
    plannedStart: { type: Date, default: null },
    plannedEnd: { type: Date, default: null },
    estimatedMinutes: { type: Number, default: 0, min: 0 },
    instructions: { type: String, default: "" },

    // ── Quantities ──
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

    // ── Status ──
    // RUNNING is kept only so legacy documents still validate.
    // New code must use IN_PROGRESS.
    status: {
      type: String,
      enum: [
        "PENDING",
        "RUNNING",
        "IN_PROGRESS",
        "PAUSED",
        "ON_HOLD",
        "COMPLETED",
        "FAILED",
        "SKIPPED",
      ],
      default: "PENDING",
      index: true,
    },
    pausedReason: { type: String, default: "" },
    failureReason: { type: String, default: "" },
    affectedQty: { type: Number, default: 0, min: 0 },

    // ── Execution history ──
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    workedMinutes: { type: Number, default: 0, min: 0 },
    pauseLog: [
      {
        pausedAt: { type: Date, default: Date.now },
        resumedAt: { type: Date, default: null },
        reason: { type: String, default: "" },
        pausedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
    remarks: {
      type: String,
      default: "",
    },

    // ── Correction cycles ──
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
productionOperationSchema.index({ machineId: 1, status: 1 });

/* ────────────────────────────────────────────────────────────────────────── */
/* Statics (must be defined BEFORE mongoose.model() compiles the schema)      */
/* ────────────────────────────────────────────────────────────────────────── */

const POPULATE_EMPLOYEE = ["assignedEmployeeId", "name email role"];
const POPULATE_MACHINE = ["machineId", "printerName model"];

productionOperationSchema.statics.findAll = async function (query = {}) {
  const filter = {};
  if (query.productionOrderId) filter.productionOrderId = query.productionOrderId;
  if (query.status) filter.status = query.status;
  if (query.assignedEmployeeId) filter.assignedEmployeeId = query.assignedEmployeeId;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.isRework !== undefined) filter.isRework = String(query.isRework) === "true";

  return this.find(filter)
    .populate(...POPULATE_EMPLOYEE)
    .populate(...POPULATE_MACHINE)
    .sort({ sequenceNo: 1 });
};

productionOperationSchema.statics.findByProductionOrder = async function (productionOrderId) {
  return this.find({ productionOrderId })
    .populate(...POPULATE_EMPLOYEE)
    .populate(...POPULATE_MACHINE)
    .sort({ sequenceNo: 1 });
};

productionOperationSchema.statics.findByProductionOrders = async function (productionOrderIds = []) {
  if (!productionOrderIds.length) return [];
  return this.find({ productionOrderId: { $in: productionOrderIds } })
    .populate(...POPULATE_EMPLOYEE)
    .populate(...POPULATE_MACHINE)
    .sort({ productionOrderId: 1, sequenceNo: 1 })
    .lean();
};

/**
 * Operations that must be finished before `operation` can start.
 * If the operation declares dependsOn, only those sequence numbers count.
 * Otherwise every lower sequence number counts (strict sequential).
 */
productionOperationSchema.statics.findPriorOperations = async function (
  productionOrderId,
  sequenceNo,
  dependsOn = []
) {
  const filter = { productionOrderId };
  if (Array.isArray(dependsOn) && dependsOn.length > 0) {
    filter.sequenceNo = { $in: dependsOn };
  } else {
    filter.sequenceNo = { $lt: sequenceNo };
  }
  return this.find(filter).sort({ sequenceNo: 1 });
};

productionOperationSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};

const ProductionOperation = mongoose.model(
  "ProductionOperation",
  productionOperationSchema,
  "productionOperations"
);

module.exports = ProductionOperation;