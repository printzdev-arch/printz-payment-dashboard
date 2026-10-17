const mongoose = require("mongoose");

const stockItemSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
    },
    legacyFirestoreId: {
      type: String,
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
    },
    stockId: {
      type: String,
      trim: true,
      index: true,
    },
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number,
      default: 0,
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    qty: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    stockType: {
      type: String,
      default: "consumable",
    },
    unit: {
      type: String,
      default: null,
    },
    pageRanges: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    minThreshold: {
      type: Number,
      default: 10,
    },
    threshold: {
      type: Number,
      default: 10,
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
    status: {
      type: String,
      default: "Active",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: String,
      default: null,
    },
    needsReview: {
      type: Boolean,
      default: false,
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

stockItemSchema.index({ branchId: 1, itemName: 1 });
stockItemSchema.index({ branchName: 1, itemName: 1 });


stockItemSchema.statics._resolveBranch = async function (identifier) {
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

stockItemSchema.statics.findAll = async function (filters = {}) {
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

  if (filters.category) query.category = new RegExp('^' + filters.category + '$', "i");
  if (filters.status) query.status = filters.status;

  return this.find(query).sort({ itemName: 1 });
};

stockItemSchema.statics.findById = async function (id) {
  if (!id) return null;
  const idStr = String(id).trim();
  const raw = await this.collection.findOne({
    $or: [
      { _id: idStr },
      ...(mongoose.Types.ObjectId.isValid(idStr) ? [{ _id: new mongoose.Types.ObjectId(idStr) }] : []),
      { stockId: idStr },
      { legacyFirestoreId: idStr },
    ],
  });
  if (raw) return new this(raw);
  return null;
};

stockItemSchema.statics.findByIdAndUpdate = async function (id, update, options = {}) {
  const idStr = String(id).trim();
  return this.findOneAndUpdate(
    {
      $or: [
        { _id: idStr },
        ...(mongoose.Types.ObjectId.isValid(idStr) ? [{ _id: new mongoose.Types.ObjectId(idStr) }] : []),
      ],
    },
    update,
    { new: true, ...options }
  );
};

stockItemSchema.statics.save = async function (data) {
  let item = null;
  const targetId = data._id || data.id;
  if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
    item = await this.findById(targetId).catch(() => null);
  }
  if (!item && data.stockId && data.branchId) {
    item = await this.findOne({ stockId: data.stockId, branchId: data.branchId });
  }

  const payload = data.toJSON ? data.toJSON() : { ...data };
  delete payload.id;
  if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
    payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
  }

  if (item) {
    Object.assign(item, payload);
    await item.save();
    return { item, isNew: false };
  }

  const newItem = new this(payload);
  await newItem.save();
  return { item: newItem, isNew: true };
};

stockItemSchema.statics.update = async function (id, updateData) {
  const existing = await this.findById(id);
  if (!existing) return null;

  const payload = updateData.toJSON ? updateData.toJSON() : { ...updateData };
  delete payload.id;
  if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
    payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
  }

  Object.assign(existing, payload);
  await existing.save();
  return existing;
};

stockItemSchema.statics.delete = async function (id) {
  const item = await this.findById(id);
  if (!item) return null;
  await this.findByIdAndDelete(item._id);
  return item;
};

const StockItem = mongoose.model("StockItem", stockItemSchema, "stocks");

if (typeof stockItemSchema !== "undefined" && typeof Branch !== "undefined" && stockItemSchema.statics) {
  Object.assign(StockItem, stockItemSchema.statics);
}

module.exports = StockItem;
