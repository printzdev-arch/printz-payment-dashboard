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
      type: mongoose.Schema.Types.Mixed,
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
    wastageQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    wastageReason: {
      type: String,
      default: null,
      trim: true,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "saleReceiptItems",
  }
);


// === INJECTED REPOSITORY STATICS ===

saleReceiptItemSchema.statics.createMany = async function (items, session = null) {
  return this.insertMany(items, { session });
};

saleReceiptItemSchema.statics.findByReceiptId = async function (receiptId) {
  return this.find({ receiptId }).lean();
};

saleReceiptItemSchema.statics.deleteByReceiptId = async function (receiptId, session = null) {
  return this.deleteMany({ receiptId }, { session });
};


module.exports =
  mongoose.models.SaleReceiptItem || mongoose.model("SaleReceiptItem", saleReceiptItemSchema);
