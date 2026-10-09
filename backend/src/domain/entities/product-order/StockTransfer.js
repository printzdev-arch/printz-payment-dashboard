/**
 * StockTransfer Domain Entity
 * Represents an approved inter-branch stock movement dispatch & receive document.
 */
class StockTransfer {
  constructor({
    id,
    _id,
    transferNo,
    productOrderId,
    fromBranchId,
    toBranchId,
    status = "APPROVED",
    items = [],
    requestedBy,
    approvedBy,
    dispatchedBy = null,
    dispatchedAt = null,
    receivedBy = null,
    receivedAt = null,
    remarks = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.transferNo = transferNo;
    this.productOrderId = productOrderId;
    this.fromBranchId = fromBranchId;
    this.toBranchId = toBranchId;
    this.status = status;
    this.items = Array.isArray(items) ? items : [];
    this.requestedBy = requestedBy;
    this.approvedBy = approvedBy;
    this.dispatchedBy = dispatchedBy;
    this.dispatchedAt = dispatchedAt ? new Date(dispatchedAt) : null;
    this.receivedBy = receivedBy;
    this.receivedAt = receivedAt ? new Date(receivedAt) : null;
    this.remarks = remarks;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }
}

module.exports = StockTransfer;
