const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    transactionNo: {
      type: String,
      required: [true, "transactionNo is required"],
      trim: true,
    },
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
    type: {
      type: String,
      required: [true, "transaction type is required"],
      enum: [
        "OPENING",
        "PURCHASE",
        "SALE",
        "ISSUE",
        "RETURN",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "ADJUSTMENT",
        "JOB_CONSUMPTION",
      ],
      index: true,
    },
    consumptionType: {
      type: String,
      enum: ["PRINTING_ASSET", "PAPER", "INK_TONER", "OTHER_CONSUMABLE", null],
      default: null,
    },
    quantity: {
      type: Number,
      required: [true, "quantity is required"],
    },
    referenceType: {
      type: String,
      enum: ["SALE", "JOB", "PURCHASE", "TRANSFER", "ADJUSTMENT", null],
      default: null,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: [true, "performedBy is required"],
      index: true,
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "inventoryTransactions",
  }
);

// Indexes specified in requirements
inventoryTransactionSchema.index({ transactionNo: 1 }, { unique: true });
inventoryTransactionSchema.index({ itemId: 1, branchId: 1, transactionDate: -1 });
inventoryTransactionSchema.index({ referenceType: 1, referenceId: 1 });


// === INJECTED REPOSITORY STATICS ===

inventoryTransactionSchema.statics.findAll = async function (query = {}, { page = 1, limit = 50, sort = { createdAt: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("itemId", "itemCode name uom category")
      .populate("branchId", "name code")
      .populate("performedBy", "name email username")
      .lean(),
    this.countDocuments(query),
  ]);
  return { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 };
};

inventoryTransactionSchema.statics.findByReference = async function (referenceType, referenceId) {
  return this.find({ referenceType, referenceId }).sort({ createdAt: -1 }).lean();
};


module.exports =
  mongoose.models.InventoryTransaction ||
  mongoose.model("InventoryTransaction", inventoryTransactionSchema);
