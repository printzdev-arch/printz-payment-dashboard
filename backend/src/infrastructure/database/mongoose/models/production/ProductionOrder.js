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
      enum: ["PLANNED", "IN_PROGRESS", "ON_HOLD", "QC", "COMPLETED", "CANCELLED"],
      default: "PLANNED",
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
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
  }
);

productionOrderSchema.index({ jobOrderId: 1, status: 1 });
productionOrderSchema.index({ branchId: 1, status: 1, createdAt: -1 });

const ProductionOrder = mongoose.model(
  "ProductionOrder",
  productionOrderSchema,
  "productionOrders"
);

module.exports = ProductionOrder;
