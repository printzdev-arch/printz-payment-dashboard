const mongoose = require("mongoose");

const stockReadingSchema = new mongoose.Schema(
  {
    legacyFirestoreId: {
      type: String,
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
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
    date: {
      type: String,
      required: [true, "Date is required"],
      index: true,
    },
    dateAt: {
      type: Date,
      default: null,
    },
    stocks: {
      type: Array,
      default: [],
    },
    items: {
      type: Array,
      default: [],
    },
    rows: {
      type: Array,
      default: [],
    },
    readings: {
      type: mongoose.Schema.Types.Mixed,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "Active",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
    submittedBy: {
      type: String,
    },
    finalSubmittedAt: {
      type: Date,
      default: null,
    },
    finalSubmittedBy: {
      type: String,
      default: null,
    },
    isFinalSubmitted: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    needsReview: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
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

stockReadingSchema.index({ date: -1 });
stockReadingSchema.index({ branchId: 1, date: -1 });
stockReadingSchema.index({ branchName: 1, date: -1 });

const StockReading = mongoose.model("StockReading", stockReadingSchema, "stockReadings");

module.exports = StockReading;
