/**
 * DeliveryOrder Domain Entity
 */
class DeliveryOrder {
  static STATUSES = {
    READY: "READY",
    ASSIGNED: "ASSIGNED",
    PACKED: "PACKED",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
  };

  static TYPES = {
    DELIVERY: "DELIVERY",
    COUNTER_PICKUP: "COUNTER_PICKUP",
    COURIER: "COURIER",
  };

  constructor({
    id,
    _id,
    deliveryNo = "",
    jobOrderId = null,
    branchId = null,
    customerId = null,
    customerName = "",
    customerPhone = "",
    deliveryAddress = "",
    deliveryType = "DELIVERY",
    quantity = 0,
    items = [],
    status = "READY",
    reviewedBy = null,
    reviewedAt = null,
    reviewNotes = "",
    deliveryPersonName = "",
    deliveryPersonPhone = "",
    assignedEmployeeId = null,
    vehicleNumber = "",
    vehicle = "",
    deliveryTime = "",
    instructions = "",
    expectedDeliveryDate = null,
    assignedAt = null,
    assignedBy = null,
    notificationSent = false,
    notificationSentAt = null,
    notificationChannels = [],
    whatsappMessageId = null,
    whatsappStatus = "NOT_SENT",
    packedAt = null,
    packedBy = null,
    packingNotes = "",
    itemsVerified = false,
    dispatchedAt = null,
    dispatchedBy = null,
    dispatchNotes = "",
    deliveredAt = null,
    deliveredBy = null,
    receivedBy = null,
    recipientName = null,
    recipientPhone = null,
    signatureUrl = null,
    pickupOtp = null,
    isOtpVerified = false,
    remarks = "",
    proofId = null,
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
    this.customerPhone = customerPhone;
    this.deliveryAddress = deliveryAddress;
    this.deliveryType = deliveryType;
    this.quantity = Number(quantity) || 0;
    this.items = items;
    this.status = status;
    this.reviewedBy = reviewedBy;
    this.reviewedAt = reviewedAt;
    this.reviewNotes = reviewNotes;
    this.deliveryPersonName = deliveryPersonName;
    this.deliveryPersonPhone = deliveryPersonPhone;
    this.assignedEmployeeId = assignedEmployeeId;
    this.vehicleNumber = vehicleNumber;
    this.vehicle = vehicle;
    this.deliveryTime = deliveryTime;
    this.instructions = instructions;
    this.expectedDeliveryDate = expectedDeliveryDate;
    this.assignedAt = assignedAt;
    this.assignedBy = assignedBy;
    this.notificationSent = notificationSent;
    this.notificationSentAt = notificationSentAt;
    this.notificationChannels = notificationChannels;
    this.whatsappMessageId = whatsappMessageId;
    this.whatsappStatus = whatsappStatus;
    this.packedAt = packedAt;
    this.packedBy = packedBy;
    this.packingNotes = packingNotes;
    this.itemsVerified = itemsVerified;
    this.dispatchedAt = dispatchedAt;
    this.dispatchedBy = dispatchedBy;
    this.dispatchNotes = dispatchNotes;
    this.deliveredAt = deliveredAt;
    this.deliveredBy = deliveredBy;
    this.receivedBy = receivedBy;
    this.recipientName = recipientName;
    this.recipientPhone = recipientPhone;
    this.signatureUrl = signatureUrl;
    this.pickupOtp = pickupOtp;
    this.isOtpVerified = isOtpVerified;
    this.remarks = remarks;
    this.proofId = proofId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = DeliveryOrder;
