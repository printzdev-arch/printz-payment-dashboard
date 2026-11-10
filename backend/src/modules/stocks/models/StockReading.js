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


stockReadingSchema.statics._resolveBranch = async function (identifier) {
  if (!identifier) return null;
  const Branch = mongoose.model("Branch");
  const trimmed = String(identifier).trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const branch = await Branch.findById(trimmed).lean();
    if (branch) return branch;
  }
  return Branch.findOne({
    $or: [
      { name: new RegExp('^' + trimmed + '$', "i") },
      { code: new RegExp('^' + trimmed + '$', "i") },
    ],
  }).lean();
};

stockReadingSchema.statics.findAll = async function (filters = {}) {
  const query = {};
  const branchIdentifier = filters.branchId || filters.branchName || filters.branch;
  if (branchIdentifier) {
    const branch = await this._resolveBranch(branchIdentifier);
    if (branch) {
      query.$or = [
        { branchId: branch._id },
        { branchId: branch._id.toString() },
        { branchName: new RegExp('^' + branch.name + '$', "i") },
      ];
    } else {
      query.$or = [
        { branchId: branchIdentifier },
        { branchName: new RegExp('^' + branchIdentifier + '$', "i") },
      ];
    }
  }

  if (filters.date) query.date = filters.date;
  if (filters.startDate && filters.endDate) {
    query.date = { $gte: filters.startDate, $lte: filters.endDate };
  }

  return this.find(query).sort({ date: -1 });
};

stockReadingSchema.statics.findById = async function (id) {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const reading = await this.findOne({ _id: id });
    if (reading) return reading;
  }
  return this.findOne({
    $or: [{ _id: id }, { legacyFirestoreId: id }],
  });
};

stockReadingSchema.statics.findByBranchAndDate = async function (branchIdentifier, date) {
  const branch = await this._resolveBranch(branchIdentifier);
  const query = { date };
  if (branch) {
    query.$or = [
      { branchId: branch._id },
      { branchId: branch._id.toString() },
      { branchName: new RegExp('^' + branch.name + '$', "i") },
    ];
  } else {
    query.$or = [
      { branchId: branchIdentifier },
      { branchName: new RegExp('^' + branchIdentifier + '$', "i") },
    ];
  }
  return this.findOne(query);
};

stockReadingSchema.statics.save = async function (data) {
  let existing = null;
  const targetId = data._id || data.id;
  if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
    existing = await this.findById(targetId).catch(() => null);
  }
  if (!existing && data.branchId && data.date) {
    existing = await this.findOne({
      $or: [{ branchId: data.branchId }, { branchId: data.branchId.toString() }],
      date: data.date,
    });
  }
  if (!existing && data.branchName && data.date) {
    existing = await this.findByBranchAndDate(data.branchName, data.date);
  }

  const payload = data.toJSON ? data.toJSON() : { ...data };
  delete payload.id;
  if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
    payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
  }

  if (existing) {
    Object.assign(existing, payload);
    existing.lastUpdated = new Date();
    await existing.save();
    return { reading: existing, isNew: false };
  }

  const reading = new this(payload);
  await reading.save();
  return { reading, isNew: true };
};

stockReadingSchema.statics.update = async function (id, updateData) {
  const existing = await this.findById(id);
  if (!existing) return null;

  const payload = updateData.toJSON ? updateData.toJSON() : { ...updateData };
  delete payload.id;
  if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
    payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
  }

  Object.assign(existing, payload);
  existing.lastUpdated = new Date();
  await existing.save();
  return existing;
};

stockReadingSchema.statics.delete = async function (id) {
  const existing = await this.findById(id);
  if (!existing) return null;
  await this.findByIdAndDelete(existing._id);
  return existing;
};

const StockReading = mongoose.model("StockReading", stockReadingSchema, "stockReadings");

if (typeof stockReadingSchema !== "undefined" && typeof Branch !== "undefined" && stockReadingSchema.statics) {
  Object.assign(StockReading, stockReadingSchema.statics);
}

module.exports = StockReading;
