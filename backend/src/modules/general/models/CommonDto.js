/**
 * Common Services Data Transfer Objects (DTOs)
 * Covers: Approval, Attachment, NumberSequence
 */

class CreateApprovalDto {
  constructor(data = {}) {
    this.referenceType = data.referenceType;
    this.referenceId = data.referenceId;
    this.requestedBy = data.requestedBy;
    this.branchId = data.branchId || null;
    this.comments = data.comments || null;
  }

  static fromRequest(req) {
    return new CreateApprovalDto({
      ...req.body,
      requestedBy: req.user?._id || req.user?.id,
    });
  }
}

class DecideApprovalDto {
  constructor(data = {}) {
    this.comments = data.comments || data.reason || null;
  }

  static fromRequest(req) {
    return new DecideApprovalDto(req.body || {});
  }
}

class UploadAttachmentDto {
  constructor(data = {}) {
    this.referenceType = data.referenceType;
    this.referenceId = data.referenceId;
    this.originalFileName = data.originalFileName;
    this.mimeType = data.mimeType;
    this.sizeBytes = data.sizeBytes;
    this.storageKey = data.storageKey;
    this.branchId = data.branchId || null;
    this.uploadedBy = data.uploadedBy;
  }

  static fromRequest(req) {
    const file = req.file || {};
    return new UploadAttachmentDto({
      ...req.body,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: req.user?._id || req.user?.id,
    });
  }
}

class GenerateNumberSequenceDto {
  constructor(data = {}) {
    this.entityType = data.entityType;
    this.prefix = data.prefix || "";
    this.padding = data.padding ? Number(data.padding) : 5;
    this.branchId = data.branchId || null;
  }

  static fromRequest(req) {
    return new GenerateNumberSequenceDto(req.body || {});
  }
}

module.exports = {
  CreateApprovalDto,
  DecideApprovalDto,
  UploadAttachmentDto,
  GenerateNumberSequenceDto,
};
