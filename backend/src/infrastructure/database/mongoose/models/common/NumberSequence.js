const mongoose = require("mongoose");

const numberSequenceSchema = new mongoose.Schema(
  {
    sequenceKey: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      default: null,
      index: true,
    },
    period: {
      type: String,
      default: null,
      trim: true,
    },
    lastValue: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "numberSequences",
  }
);

// Compound Unique Index: prevents race condition / duplicates per key+branch+period
numberSequenceSchema.index(
  { sequenceKey: 1, branchId: 1, period: 1 },
  { unique: true }
);

module.exports = mongoose.models.CommonNumberSequence || mongoose.model("CommonNumberSequence", numberSequenceSchema);
