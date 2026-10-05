const mongoose = require("mongoose");

const totalAmountReadingSchema = new mongoose.Schema(
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
    totalAmount: {
      type: Number,
      default: 0,
    },
    cash: {
      type: Number,
      default: 0,
    },
    online: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    expenses: {
      type: Number,
      default: 0,
    },
    rows: {
      type: Array,
      default: [],
    },
    previousBalanceRows: {
      type: Array,
      default: [],
    },
    denominations: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
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
    remarks: {
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

totalAmountReadingSchema.index({ branchId: 1, date: 1 });
totalAmountReadingSchema.index({ branchName: 1, date: 1 });

const TotalAmountReading = mongoose.model(
  "TotalAmountReading",
  totalAmountReadingSchema,
  "totalAmountReadings"
);

module.exports = TotalAmountReading;
