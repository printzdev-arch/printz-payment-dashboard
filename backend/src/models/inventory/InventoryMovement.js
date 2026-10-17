const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
  {
    legacyFirestoreId: String,
    action: {
      type: String,
      enum: ["add", "clone", "move", "update", "delete", "consume", "JOB_CONSUMPTION", "OUT"],
      required: true,
    },
    type: {
      type: String,
      enum: ["asset", "printer", "stock", "JOB_CONSUMPTION"],
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


inventoryMovementSchema.statics.findAll = async function (filters = {}) {
  const query = {};
  if (filters.type) query.type = filters.type;
  if (filters.action) query.action = filters.action;
  if (filters.date) {
    const dateStr = String(filters.date).trim();
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
    if (!isNaN(startOfDay.getTime())) {
      query.$or = [
        { movementDate: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
      ];
    }
  }
  return this.find(query).sort({ movementDate: -1, createdAt: -1 });
};

inventoryMovementSchema.statics.create = async function (data) {
  const movement = new this(data);
  await movement.save();
  return movement;
};

const InventoryMovement = mongoose.model(
  "InventoryMovement",
  inventoryMovementSchema,
  "inventoryMovements"
);

if (typeof inventoryMovementSchema !== "undefined" && typeof InventoryMovement !== "undefined" && inventoryMovementSchema.statics) {
  Object.assign(InventoryMovement, inventoryMovementSchema.statics);
}

module.exports = InventoryMovement;
