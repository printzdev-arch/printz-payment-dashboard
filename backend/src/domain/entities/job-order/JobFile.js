class JobFile {
  constructor({
    id = null,
    jobOrderId,
    jobItemId = null,
    fileCategory, // CUSTOMER_SAMPLE, REFERENCE, PRINT_READY, PROOFS, FINAL_ARTWORK, OTHER
    attachmentId = null,
    fileUrl = "",
    fileName = "",
    fileSize = 0,
    mimeType = "",
    versionNo = 1,
    uploadedBy = null,
    uploadedAt = new Date(),
  }) {
    this.id = id;
    this.jobOrderId = jobOrderId;
    this.jobItemId = jobItemId;
    this.fileCategory = fileCategory;
    this.attachmentId = attachmentId;
    this.fileUrl = fileUrl;
    this.fileName = fileName;
    this.fileSize = fileSize;
    this.mimeType = mimeType;
    this.versionNo = versionNo;
    this.uploadedBy = uploadedBy;
    this.uploadedAt = uploadedAt;
  }
}

module.exports = JobFile;
