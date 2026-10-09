/**
 * Approval Domain Entity
 */
class Approval {
  constructor({
    id,
    _id,
    approvalNo,
    referenceType,
    referenceId,
    requestedBy,
    approverId = null,
    status = "PENDING",
    requestedAt = new Date(),
    decidedAt = null,
    comments = null,
    branchId = null,
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.approvalNo = approvalNo; // e.g. "APR-00001"
    this.referenceType = referenceType; // e.g. "PRODUCT_ORDER", "LEAVE_REQUEST", "SALE_RECEIPT_VOID"
    this.referenceId = referenceId;
    this.requestedBy = requestedBy;
    this.approverId = approverId;
    this.status = status; // "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
    this.requestedAt = requestedAt ? new Date(requestedAt) : new Date();
    this.decidedAt = decidedAt ? new Date(decidedAt) : null;
    this.comments = comments;
    this.branchId = branchId;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  isPending() {
    return this.status === "PENDING";
  }

  isDecided() {
    return ["APPROVED", "REJECTED", "CANCELLED"].includes(this.status);
  }
}

module.exports = Approval;
