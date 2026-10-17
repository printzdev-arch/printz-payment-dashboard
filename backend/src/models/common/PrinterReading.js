const mongoose = require("mongoose");

const printerReadingSchema = new mongoose.Schema(
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
      default: function () {
        return this.date ? new Date(this.date) : new Date();
      },
    },
    readings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
  },
  {
    timestamps: false,
    versionKey: false,
    strict: false,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

printerReadingSchema.index({ branchId: 1, date: 1 });
printerReadingSchema.index({ branchName: 1, date: 1 });

const PrinterReading = mongoose.model("PrinterReading", printerReadingSchema, "printerReadings");

module.exports = PrinterReading;
