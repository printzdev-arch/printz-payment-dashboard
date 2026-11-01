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


jumboXeroxReadingSchema.statics.findAll = async function (filters = {}) {
  const query = {};
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.branchName) query.branchName = filters.branchName;
  if (filters.date) query.date = filters.date;
  if (filters.startDate && filters.endDate) {
    query.date = { $gte: filters.startDate, $lte: filters.endDate };
  }
  return this.find(query).sort({ date: -1 });
};

jumboXeroxReadingSchema.statics.findByBranchAndDate = async function (branchNameOrId, date) {
  return this.findOne({
    $or: [
      { branchName: branchNameOrId },
      { branchId: branchNameOrId },
    ],
    date,
  });
};

jumboXeroxReadingSchema.statics.save = async function (data) {
  let existing = null;
  if (data._id) {
    existing = await this.findById(data._id);
  }
  if (!existing && data.branchName && data.date) {
    existing = await this.findByBranchAndDate(data.branchName, data.date);
  }
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  const doc = new this(data);
  await doc.save();
  return doc;
};

jumboXeroxReadingSchema.statics.delete = async function (id) {
  return this.findByIdAndDelete(id);
};

const JumboXeroxReading = mongoose.model("JumboXeroxReading", jumboXeroxReadingSchema, "jumboXeroxReadings");

if (typeof jumboXeroxReadingSchema !== "undefined" && typeof JumboXeroxReading !== "undefined" && jumboXeroxReadingSchema.statics) {
  Object.assign(JumboXeroxReading, jumboXeroxReadingSchema.statics);
}

module.exports = JumboXeroxReading;

