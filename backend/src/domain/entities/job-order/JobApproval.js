class JobApproval {
  constructor({
    id = null,
    approvalNo,
    jobOrderId,
    productionOrderId = null,
    approvalType, // ESTIMATE, SAMPLE, QC
    versionNo = 1,
    status = "PENDING", // PENDING, APPROVED, REJECTED, EXPIRED
    requestedFrom = null,
    requestedBy = null,
    decisionBy = null,
    decidedBy = null,
    decisionAt = null,
    decidedAt = null,
    comments = "",
    remarks = "",
    rejectionReason = "",
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.approvalNo = approvalNo;
    this.jobOrderId = jobOrderId;
    this.productionOrderId = productionOrderId;
    this.approvalType = approvalType;
    this.versionNo = versionNo;
    this.status = status;
    this.requestedFrom = requestedFrom;
    this.requestedBy = requestedBy;
    this.decisionBy = decisionBy || decidedBy;
    this.decisionAt = decisionAt || decidedAt;
    this.comments = comments || remarks;
    this.rejectionReason = rejectionReason;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = JobApproval;
