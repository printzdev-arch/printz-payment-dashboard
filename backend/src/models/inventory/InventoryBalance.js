const mongoose = require("mongoose");

const inventoryBalanceSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: [true, "itemId is required"],
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "branchId is required"],
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "inventoryBalances",
  }
);

// Compound Unique Index: One balance record per item per branch
inventoryBalanceSchema.index({ itemId: 1, branchId: 1 }, { unique: true });


// === INJECTED REPOSITORY STATICS ===

inventoryBalanceSchema.statics.findAll = async function (query = {}, { page = 1, limit = 50, sort = { updatedAt: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("itemId")
      .populate("branchId", "name code type branchType")
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

inventoryBalanceSchema.statics.findByItemAndBranch = async function (itemId, branchId, session = null) {
  if (!itemId || !branchId) return null;
  const iId = mongoose.Types.ObjectId.isValid(itemId) ? new mongoose.Types.ObjectId(itemId) : itemId;
  const bId = mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : branchId;

  const query = this.findOne({ itemId: iId, branchId: bId });
  if (session) query.session(session);
  return query.lean();
};

inventoryBalanceSchema.statics.incrementBalance = async function (itemId, branchId, quantityChange, session = null) {
  const iId = mongoose.Types.ObjectId.isValid(itemId) ? new mongoose.Types.ObjectId(itemId) : itemId;
  const bId = mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : branchId;

  const filter = { itemId: iId, branchId: bId };
  const update = {
    $inc: { quantity: Number(quantityChange) },
    $set: { updatedAt: new Date() },
  };
  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
    session,
  };

  return this.findOneAndUpdate(filter, update, options).lean();
};

inventoryBalanceSchema.statics.findWithItemDetails = async function (
  matchFilter = {},
  { page = 1, limit = 50, category = null, lowStock = false, search = null, activeOnly = false, warehouseOnly = false } = {}
) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const pipeline = [
    { $match: matchFilter },
    {
      $lookup: {
        from: "inventoryItems",
        localField: "itemId",
        foreignField: "_id",
        as: "item",
      },
    },
    { $unwind: "$item" },
  ];

  if (category) {
    pipeline.push({ $match: { "item.category": category } });
  }

  if (activeOnly) {
    pipeline.push({ $match: { "item.isActive": true } });
  }

  if (warehouseOnly) {
    pipeline.push({
      $lookup: {
        from: "branches",
        localField: "branchId",
        foreignField: "_id",
        as: "branch",
      },
    });
    pipeline.push({ $unwind: "$branch" });
    pipeline.push({
      $match: {
        $or: [
          { "branch.branchType": "warehouse" },
          { "branch.type": "warehouse" },
        ],
      },
    });
  }

  if (search) {
    const sRegex = new RegExp(String(search).trim(), "i");
    pipeline.push({
      $match: {
        $or: [
          { "item.itemCode": sRegex },
          { "item.name": sRegex },
          { "item.sku": sRegex },
        ],
      },
    });
  }

  if (lowStock) {
    pipeline.push({
      $match: {
        $expr: {
          $lte: ["$quantity", { $ifNull: ["$item.reorderLevel", 0] }],
        },
      },
    });
  }

  const countPipeline = [...pipeline, { $count: "total" }];
  pipeline.push({ $sort: { updatedAt: -1 } });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: Math.max(1, limit) });

  const [records, countRes] = await Promise.all([
    this.aggregate(pipeline),
    this.aggregate(countPipeline),
  ]);

  const total = countRes[0]?.total || 0;
  return {
    records,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit) || 1,
  };
};

inventoryBalanceSchema.statics.findLowStock = async function (branchId = null, { page = 1, limit = 50 } = {}) {
  const matchFilter = {};
  if (branchId) {
    matchFilter.branchId = mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId;
  }
  return this.findWithItemDetails(matchFilter, { page, limit, lowStock: true, activeOnly: true });
};


module.exports = mongoose.models.InventoryBalance || mongoose.model("InventoryBalance", inventoryBalanceSchema);
