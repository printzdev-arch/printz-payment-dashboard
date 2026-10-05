/**
 * InventoryMovement Domain Entity
 */
class InventoryMovement {
  constructor({
    id,
    _id,
    legacyFirestoreId,
    action,
    type,
    category,
    itemName,
    stockId,
    printerId,
    printerName,
    printerType,
    originalPrinterId,
    newPrinterId,
    assetId,
    assetName,
    amount,
    quantity,
    fromBranchId,
    toBranchId,
    details = {},
    performedBy,
    movementDate,
    sourceType,
    sourceId,
    needsReview,
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.legacyFirestoreId = legacyFirestoreId;
    this.action = action;
    this.type = type;
    this.category = category;
    this.itemName = itemName;
    this.stockId = stockId;
    this.printerId = printerId;
    this.printerName = printerName;
    this.printerType = printerType;
    this.originalPrinterId = originalPrinterId;
    this.newPrinterId = newPrinterId;
    this.assetId = assetId;
    this.assetName = assetName;
    this.amount = amount;
    this.quantity = quantity;
    this.fromBranchId = fromBranchId;
    this.toBranchId = toBranchId;
    this.details = details;
    this.performedBy = performedBy;
    this.movementDate = movementDate;
    this.sourceType = sourceType;
    this.sourceId = sourceId;
    this.needsReview = needsReview;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = InventoryMovement;
