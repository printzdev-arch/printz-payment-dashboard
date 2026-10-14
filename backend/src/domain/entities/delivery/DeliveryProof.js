/**
 * DeliveryProof Domain Entity
 */
class DeliveryProof {
  static TYPES = {
    SIGNATURE: "SIGNATURE",
    OTP: "OTP",
    PHOTO: "PHOTO",
    SIGNATURE_AND_PHOTO: "SIGNATURE_AND_PHOTO",
    MANUAL: "MANUAL",
    HYBRID: "HYBRID",
  };

  static STATUSES = {
    VERIFIED: "VERIFIED",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
  };

  constructor({
    id,
    _id,
    proofNo = "",
    deliveryOrderId = null,
    deliveryNo = "",
    jobOrderId = null,
    branchId = null,
    recipientName = "",
    recipientPhone = "",
    recipientRelationship = "CUSTOMER",
    deliveryType = "DELIVERY",
    signatureUrl = null,
    otp = null,
    otpVerified = false,
    deliveryPhotos = [],
    remarks = "",
    proofType = "SIGNATURE",
    location = { latitude: null, longitude: null, address: "" },
    recordedBy = null,
    deliveredBy = null,
    deliveryPersonName = "",
    deliveredAt = new Date(),
    status = "VERIFIED",
    handoverStage = "DELIVERED",
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.proofNo = proofNo;
    this.deliveryOrderId = deliveryOrderId;
    this.deliveryNo = deliveryNo;
    this.jobOrderId = jobOrderId;
    this.branchId = branchId;
    this.recipientName = recipientName;
    this.recipientPhone = recipientPhone;
    this.recipientRelationship = recipientRelationship;
    this.deliveryType = deliveryType;
    this.signatureUrl = signatureUrl;
    this.otp = otp;
    this.otpVerified = otpVerified;
    this.deliveryPhotos = deliveryPhotos;
    this.remarks = remarks;
    this.proofType = proofType;
    this.location = location;
    this.recordedBy = recordedBy;
    this.deliveredBy = deliveredBy;
    this.deliveryPersonName = deliveryPersonName;
    this.deliveredAt = deliveredAt;
    this.status = status;
    this.handoverStage = handoverStage;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = DeliveryProof;
