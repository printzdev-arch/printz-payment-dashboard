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

module.exports = ProductionOperation;
