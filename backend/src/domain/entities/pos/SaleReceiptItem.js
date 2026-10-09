/**
 * SaleReceiptItem Domain Entity
 * Represents an individual line item of a POS Sale Receipt.
 */
class SaleReceiptItem {
  constructor({
    id,
    _id,
    receiptId,
    productId,
    productName,
    quantity,
    unitPrice,
    discount = 0,
    taxRate = 0,
    taxAmount = 0,
    lineTotal = 0,
    consumptionSnapshot = [],
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.receiptId = receiptId;
    this.productId = productId;
    this.productName = productName;
    this.quantity = Number(quantity) || 0;
    this.unitPrice = Number(unitPrice) || 0;
    this.discount = Number(discount) || 0;
    this.taxRate = Number(taxRate) || 0;
    this.taxAmount = Number(taxAmount) || 0;
    this.lineTotal = Number(lineTotal) || 0;
    this.consumptionSnapshot = Array.isArray(consumptionSnapshot) ? consumptionSnapshot : [];
  }
}

module.exports = SaleReceiptItem;
