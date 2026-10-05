const mongoose = require("mongoose");

const stockItemSchema = new mongoose.Schema(
  {
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

const StockItem = mongoose.model("StockItem", stockItemSchema, "stocks");

module.exports = StockItem;
