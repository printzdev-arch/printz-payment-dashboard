/**
 * InventoryBalance Domain Entity
 * Current stock per item per branch.
 */
class InventoryBalance {
  constructor({
    id,
    _id,
    itemId,
    branchId,
    quantity = 0,
    updatedAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.itemId = itemId;
    this.branchId = branchId;
    this.quantity = Number(quantity) || 0;
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  isLowStock(reorderLevel = 0) {
    return this.quantity <= reorderLevel;
  }
}

module.exports = InventoryBalance;
