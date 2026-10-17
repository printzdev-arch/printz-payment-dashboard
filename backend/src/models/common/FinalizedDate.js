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


finalizedDateSchema.statics.findAll = async function (filters = {}) {
  const query = {};
  if (filters.branchName) query.branchName = filters.branchName;
  if (filters.date) query.date = filters.date;
  return this.find(query);
};

finalizedDateSchema.statics.findByBranchAndDate = async function (branchName, date) {
  return this.findOne({ branchName, date });
};

finalizedDateSchema.statics.finalize = async function (branchName, date, data) {
  return this.findOneAndUpdate(
    { branchName, date },
    { ...data, isFinalized: true },
    { upsert: true, new: true }
  );
};

const FinalizedDate = mongoose.model("FinalizedDate", finalizedDateSchema, "finalizedDates");

if (typeof finalizedDateSchema !== "undefined" && typeof FinalizedDate !== "undefined" && finalizedDateSchema.statics) {
  Object.assign(FinalizedDate, finalizedDateSchema.statics);
}

module.exports = FinalizedDate;
