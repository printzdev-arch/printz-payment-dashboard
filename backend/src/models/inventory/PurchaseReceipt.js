const mongoose = require("mongoose");

const purchaseReceiptItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.0001,
    },
    purchaseRate: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseReceiptSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: [true, "receiptNo is required"],
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "branchId is required"],
      index: true,
    },
    supplierName: {
      type: String,
      required: [true, "supplierName is required"],
      trim: true,
    },
    supplierInvoiceNo: {
      type: String,
      trim: true,
      default: null,
    },
    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    items: {
      type: [purchaseReceiptItemSchema],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: "At least one item is required in a purchase receipt",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["DRAFT", "POSTED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    remarks: {
      type: String,
      default: null,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "purchaseReceipts",
  }
);

purchaseReceiptSchema.index({ receiptNo: 1 }, { unique: true });
purchaseReceiptSchema.index({ branchId: 1, status: 1, receivedDate: -1 });


// === INJECTED REPOSITORY STATICS ===

purchaseReceiptSchema.statics.findAll = async function (query = {}, { page = 1, limit = 50, sort = { createdAt: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("branchId", "name code")
      .populate("receivedBy", "name email username")
      .populate("items.itemId", "itemCode name uom category")
      .lean(),
    this.countDocuments(query),
  ]);
  return { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 };
};

purchaseReceiptSchema.statics.update = async function (id, data) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return this.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
};

purchaseReceiptSchema.statics.updateStatus = async function (id, status) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return this.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
};


module.exports =
  mongoose.models.PurchaseReceipt || mongoose.model("PurchaseReceipt", purchaseReceiptSchema);
