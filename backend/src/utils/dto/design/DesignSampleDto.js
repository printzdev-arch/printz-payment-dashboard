/**
 * Design Sample DTOs (Module 07)
 */

class UploadSampleDto {
  constructor(data = {}) {
    this.jobItemId = data.jobItemId || null;
    this.comments = data.comments || "";
    this.fileUrl = data.fileUrl || "";
    this.fileId = data.fileId || null;
  }
}

class PatchSampleDto {
  constructor(data = {}) {
    if (data.comments !== undefined) this.comments = data.comments;
    if (data.fileUrl !== undefined) this.fileUrl = data.fileUrl;
    if (data.fileId !== undefined) this.fileId = data.fileId;
  }
}

class SubmitSampleDto {
  constructor(data = {}) {
    this.customerPhone = data.customerPhone || "";
    this.shareViaWhatsapp = Boolean(data.shareViaWhatsapp);
  }
}

class SampleDecisionDto {
  constructor(data = {}) {
    this.decision = (data.decision || "APPROVED").toUpperCase().trim(); // APPROVED, REVISION_REQUIRED
    this.customerFeedback = data.customerFeedback || data.comments || "";
    this.revisionReason = data.revisionReason || data.reason || "";
  }
}

module.exports = {
  UploadSampleDto,
  PatchSampleDto,
  SubmitSampleDto,
  SampleDecisionDto,
};
