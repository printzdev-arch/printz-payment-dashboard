const mongoose = require("mongoose");

const finalizedDateSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: true,
      index: true,
    },
    branch: String,
    date: {
      type: String,
      required: true,
      index: true,
    },
    isFinalized: {
      type: Boolean,
      default: true,
    },
    finalizedBy: String,
  },
  {
    timestamps: true,
    strict: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

finalizedDateSchema.index({ branchName: 1, date: 1 }, { unique: true });

const FinalizedDate = mongoose.model("FinalizedDate", finalizedDateSchema, "finalizedDates");

module.exports = FinalizedDate;
