const mongoose = require("mongoose");

const jumboXeroxReadingSchema = new mongoose.Schema(
  {
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
    readings: {
      type: mongoose.Schema.Types.Mixed,
    },
    rows: {
      type: Array,
      default: [],
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalQty: {
      type: Number,
      default: 0,
    },
    totalSqMeters: {
      type: Number,
      default: 0,
    },
    jumboCounter: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
    },
    submittedBy: {
      type: String,
    },
    userId: {
      type: String,
    },
    isFinalSubmitted: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret._id;
        return ret;
      },
    },
  }
);

jumboXeroxReadingSchema.index({ branchId: 1, date: 1 });
jumboXeroxReadingSchema.index({ branchName: 1, date: 1 });

const JumboXeroxReading = mongoose.model("JumboXeroxReading", jumboXeroxReadingSchema, "jumboXeroxReadings");

module.exports = JumboXeroxReading;

