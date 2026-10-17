const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: [true, "itemCode is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      index: true,
    },
    hsnCode: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    unit: {
      type: String,
      required: [true, "unit is required"],
      trim: true,
      uppercase: true,
      default: "PCS",
    },
    purchaseRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    saleRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    reorderLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    isStockTracked: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "inventoryItems",
  }
);

inventoryItemSchema.index({ itemCode: 1 }, { unique: true });
inventoryItemSchema.index({ name: "text", itemCode: "text", hsnCode: "text" });


// === INJECTED REPOSITORY STATICS ===

inventoryItemSchema.statics.findAll = async function (query = {}, { page = 1, limit = 50, sort = { itemCode: 1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query).sort(sort).skip(skip).limit(Math.max(1, limit)).lean(),
    this.countDocuments(query),
  ]);
  return { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 };
};

inventoryItemSchema.statics.findByItemCode = async function (itemCode) {
  if (!itemCode) return null;
  return this.findOne({ itemCode: String(itemCode).trim().toUpperCase() }).lean();
};

inventoryItemSchema.statics.update = async function (id, data) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return this.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
};

inventoryItemSchema.statics.setActive = async function (id, isActive) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return this.findByIdAndUpdate(id, { $set: { isActive: Boolean(isActive) } }, { new: true }).lean();
};


module.exports = mongoose.models.InventoryItem || mongoose.model("InventoryItem", inventoryItemSchema);
