/**
 * DeliveryOrder Domain Entity
 */
class DeliveryOrder {
  static STATUSES = {
    READY: "READY",
    PACKED: "PACKED",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
  };

  constructor({
    id,
    _id,
    deliveryNo = "",
    jobOrderId = null,
    branchId = null,
    customerId = null,
    customerName = "",
    deliveryAddress = "",
    quantity = 0,
    status = "READY",
    packedAt = null,
    packedBy = null,
    dispatchedAt = null,
    dispatchedBy = null,
    deliveredAt = null,
    deliveredBy = null,
    receivedBy = null,
    remarks = "",
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.deliveryNo = deliveryNo;
    this.jobOrderId = jobOrderId;
    this.branchId = branchId;
    this.customerId = customerId;
    this.customerName = customerName;
    this.deliveryAddress = deliveryAddress;
    this.quantity = Number(quantity) || 0;
    this.status = status;
    this.packedAt = packedAt;
    this.packedBy = packedBy;
    this.dispatchedAt = dispatchedAt;
    this.dispatchedBy = dispatchedBy;
    this.deliveredAt = deliveredAt;
    this.deliveredBy = deliveredBy;
    this.receivedBy = receivedBy;
    this.remarks = remarks;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = DeliveryOrder;
