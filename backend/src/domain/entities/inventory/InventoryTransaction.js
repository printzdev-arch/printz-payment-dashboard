/**
 * InventoryTransaction Domain Entity
 * Immutable inventory ledger / history record.
 */
class InventoryTransaction {
  static get TYPES() {
    return Object.freeze({
      OPENING: "OPENING",
      PURCHASE: "PURCHASE",
      SALE: "SALE",
      ISSUE: "ISSUE",
      RETURN: "RETURN",
      TRANSFER_IN: "TRANSFER_IN",
      TRANSFER_OUT: "TRANSFER_OUT",
      ADJUSTMENT: "ADJUSTMENT",
      JOB_CONSUMPTION: "JOB_CONSUMPTION",
    });
  }

  static get CONSUMPTION_TYPES() {
    return Object.freeze({
      PRINTING_ASSET: "PRINTING_ASSET",
      PAPER: "PAPER",
      INK_TONER: "INK_TONER",
      OTHER_CONSUMABLE: "OTHER_CONSUMABLE",
    });
  }

  static get REFERENCE_TYPES() {
    return Object.freeze({
      SALE: "SALE",
      JOB: "JOB",
      PURCHASE: "PURCHASE",
      TRANSFER: "TRANSFER",
      ADJUSTMENT: "ADJUSTMENT",
    });
  }

  constructor({
    id,
    _id,
    transactionNo,
    itemId,
    branchId,
    type,
    consumptionType = null,
    quantity,
    referenceType = null,
    referenceId = null,
    performedBy,
    transactionDate = new Date(),
    notes = null,
    createdAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.transactionNo = transactionNo;
    this.itemId = itemId;
    this.branchId = branchId;
    this.type = type;
    this.consumptionType = consumptionType;
    this.quantity = Number(quantity) || 0;
    this.referenceType = referenceType;
    this.referenceId = referenceId;
    this.performedBy = performedBy;
    this.transactionDate = transactionDate ? new Date(transactionDate) : new Date();
    this.notes = notes;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
  }
}

module.exports = InventoryTransaction;
