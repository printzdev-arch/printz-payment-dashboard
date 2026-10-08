class JobSample {
  constructor({
    id = null,
    jobOrderId,
    jobItemId = null,
    versionNo = 1,
    revisionNo = 0,
    fileId = null,
    fileUrl = "",
    comments = "",
    status = "DRAFT", // DRAFT, SUBMITTED, APPROVED, REVISION_REQUIRED
    customerPhone = "",
    submittedAt = null,
    submittedBy = null,
    approvedAt = null,
    approvedBy = null,
    customerFeedback = "",
    revisionReason = "",
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.jobOrderId = jobOrderId;
    this.jobItemId = jobItemId;
    this.versionNo = versionNo;
    this.revisionNo = revisionNo;
    this.fileId = fileId;
    this.fileUrl = fileUrl;
    this.comments = comments;
    this.status = status;
    this.customerPhone = customerPhone;
    this.submittedAt = submittedAt;
    this.submittedBy = submittedBy;
    this.approvedAt = approvedAt;
    this.approvedBy = approvedBy;
    this.customerFeedback = customerFeedback;
    this.revisionReason = revisionReason;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = JobSample;
