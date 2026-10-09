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

module.exports = mongoose.models.InventoryItem || mongoose.model("InventoryItem", inventoryItemSchema);
