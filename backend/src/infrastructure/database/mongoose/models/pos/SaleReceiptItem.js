const mongoose = require("mongoose");

const consumptionItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: {
      type: String,
      default: null,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.0001,
    },
    unit: {
      type: String,
      default: "PCS",
      trim: true,
    },
    consumptionType: {
      type: String,
      enum: ["PAPER", "INK_TONER", "PRINTING_ASSET", "OTHER_CONSUMABLE"],
      default: "OTHER_CONSUMABLE",
    },
    transactionId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false }
);

const saleReceiptItemSchema = new mongoose.Schema(
  {
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SaleReceipt",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.0001,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    consumptionSnapshot: {
      type: [consumptionItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "saleReceiptItems",
  }
);

module.exports =
  mongoose.models.SaleReceiptItem || mongoose.model("SaleReceiptItem", saleReceiptItemSchema);
