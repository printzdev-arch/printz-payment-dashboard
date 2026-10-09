/**
 * ProductOrderItem Domain Entity
 * Represents a single line item within a ProductOrder.
 */
class ProductOrderItem {
  constructor({
    id,
    _id,
    orderId,
    itemId,
    requestedQty,
    approvedQty = 0,
    dispatchedQty = 0,
    receivedQty = 0,
    unit = "PCS",
    remarks = null,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.orderId = orderId;
    this.itemId = itemId;
    this.requestedQty = Number(requestedQty) || 0;
    this.approvedQty = Number(approvedQty) || 0;
    this.dispatchedQty = Number(dispatchedQty) || 0;
    this.receivedQty = Number(receivedQty) || 0;
    this.unit = unit ? String(unit).trim().toUpperCase() : "PCS";
    this.remarks = remarks;
  }
}

module.exports = ProductOrderItem;
