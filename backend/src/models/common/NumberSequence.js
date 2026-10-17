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


// === INJECTED REPOSITORY STATICS ===

numberSequenceSchema.statics.incrementAndGet = async function (sequenceKey, branchId = null, period = null) {
  const key = String(sequenceKey).trim().toUpperCase();
  const bId = branchId
    ? mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId
    : null;
  const p = period ? String(period).trim() : null;

  const filter = {
    sequenceKey: key,
    branchId: bId,
    period: p,
  };

  const update = {
    $inc: { lastValue: 1 },
    $setOnInsert: {
      sequenceKey: key,
      branchId: bId,
      period: p,
    },
  };

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  };

  return this.findOneAndUpdate(filter, update, options).lean();
};

numberSequenceSchema.statics.findByKey = async function (sequenceKey, branchId = null, period = null) {
  const key = String(sequenceKey).trim().toUpperCase();
  const bId = branchId
    ? mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId
    : null;
  const p = period ? String(period).trim() : null;

  return this.findOne({ sequenceKey: key, branchId: bId, period: p })
    .populate("branchId", "name code")
    .lean();
};

numberSequenceSchema.statics.findAll = async function (query = {}, { page = 1, limit = 50, sort = { sequenceKey: 1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("branchId", "name code")
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    records,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit) || 1,
  };
};

numberSequenceSchema.statics.resetSequence = async function (sequenceKey, branchId = null, period = null, value = 0) {
  const key = String(sequenceKey).trim().toUpperCase();
  const bId = branchId
    ? mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId
    : null;
  const p = period ? String(period).trim() : null;

  return this.findOneAndUpdate(
    { sequenceKey: key, branchId: bId, period: p },
    { $set: { lastValue: Number(value) } },
    { new: true }
  ).lean();
};


module.exports = mongoose.models.CommonNumberSequence || mongoose.model("CommonNumberSequence", numberSequenceSchema);
