/**
 * ProductOrder Domain Entity
 * Represents a branch stock request order.
 */
class ProductOrder {
  constructor({
    id,
    _id,
    orderNo,
    requestingBranchId,
    requestedBy,
    status = "DRAFT",
    approvedBy = null,
    approvedAt = null,
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
    this.orderNo = orderNo;
    this.requestingBranchId = requestingBranchId;
    this.requestedBy = requestedBy;
    this.status = status;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt ? new Date(approvedAt) : null;
    this.dispatchedBy = dispatchedBy;
    this.dispatchedAt = dispatchedAt ? new Date(dispatchedAt) : null;
    this.receivedBy = receivedBy;
    this.receivedAt = receivedAt ? new Date(receivedAt) : null;
    this.remarks = remarks;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }
}

module.exports = ProductOrder;
