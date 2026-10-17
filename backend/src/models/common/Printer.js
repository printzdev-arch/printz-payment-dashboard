const mongoose = require("mongoose");

const printerSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
    },
    printerId: {
      type: String,
      trim: true,
      index: true,
    },
    printerIdRaw: {
      type: String,
      trim: true,
    },
    printerName: {
      type: String,
      required: [true, "Printer name is required"],
      trim: true,
    },
    printerType: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    customServices: {
      type: [String],
      default: [],
    },
    prices: {
      type: Array,
      default: [],
    },
    rates: {
      type: mongoose.Schema.Types.Mixed,
    },
    colorRates: {
      type: mongoose.Schema.Types.Mixed,
    },
    bwRates: {
      type: mongoose.Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    branchName: {
      type: String,
      trim: true,
      index: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: "Active",
    },
    userId: {
      type: String,
      default: null,
    },
    needsReview: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: false,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
  }
);

printerSchema.index({ branchId: 1, status: 1 });
printerSchema.index({ branchName: 1, status: 1 });

const Printer = mongoose.model("Printer", printerSchema, "printers");

module.exports = Printer;
