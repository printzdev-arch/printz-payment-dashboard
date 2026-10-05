const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
  {
    legacyFirestoreId: String,
    action: {
      type: String,
      enum: ["add", "clone", "move", "update", "delete"],
      required: true,
    },
    type: {
      type: String,
      enum: ["asset", "printer", "stock"],
      required: true,
    },
    category: String,
    itemName: String,
    stockId: String,
    printerId: String,
    printerName: String,
    printerType: String,
    originalPrinterId: String,
    newPrinterId: String,
    assetId: String,
    assetName: String,
    amount: Number,
    quantity: Number,
    fromBranchId: String,
    toBranchId: String,
    details: mongoose.Schema.Types.Mixed,
    performedBy: String,
    movementDate: {
      type: Date,
      default: Date.now,
    },
    sourceType: String,
    sourceId: String,
    needsReview: Boolean,
  },
  {
    timestamps: true,
    strict: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

inventoryMovementSchema.index({ type: 1, action: 1, movementDate: -1 });

const InventoryMovement = mongoose.model(
  "InventoryMovement",
  inventoryMovementSchema,
  "inventoryMovements"
);

module.exports = InventoryMovement;
