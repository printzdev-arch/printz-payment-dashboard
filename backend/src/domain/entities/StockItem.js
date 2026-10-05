/**
 * StockItem Domain Entity
 */
class StockItem {
  constructor({
    id,
    _id,
    itemName,
    category = "General",
    branchName,
    branch = "",
    quantity = 0,
    rate = 0,
    unit = "pcs",
    threshold = 10,
    status = "Available",
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.itemName = itemName;
    this.category = category;
    this.branchName = branchName;
    this.branch = branch || branchName;
    this.quantity = Number(quantity) || 0;
    this.rate = Number(rate) || 0;
    this.unit = unit;
    this.threshold = Number(threshold) || 10;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = StockItem;
