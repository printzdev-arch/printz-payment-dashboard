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

module.exports = mongoose.models.InventoryBalance || mongoose.model("InventoryBalance", inventoryBalanceSchema);
