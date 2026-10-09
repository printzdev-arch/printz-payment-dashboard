/**
 * InventoryItem Domain Entity
 * Represents Item/Product Master.
 */
class InventoryItem {
  constructor({
    id,
    _id,
    itemCode,
    name,
    category = null,
    hsnCode = null,
    unit,
    purchaseRate = 0,
    saleRate = 0,
    taxRate = 0,
    reorderLevel = 0,
    isActive = true,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.itemCode = itemCode ? String(itemCode).trim().toUpperCase() : "";
    this.name = name ? String(name).trim() : "";
    this.category = category ? String(category).trim().toUpperCase() : null;
    this.hsnCode = hsnCode ? String(hsnCode).trim() : null;
    this.unit = unit ? String(unit).trim().toUpperCase() : "PCS";
    this.purchaseRate = Number(purchaseRate) || 0;
    this.saleRate = Number(saleRate) || 0;
    this.taxRate = Number(taxRate) || 0;
    this.reorderLevel = Number(reorderLevel) || 0;
    this.isActive = Boolean(isActive);
    this.isStockTracked = isStockTracked !== undefined ? Boolean(isStockTracked) : true;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }
}

module.exports = InventoryItem;
