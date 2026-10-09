/**
 * Common Services Data Transfer Objects (DTOs)
 * Covers: AuditLog, Approval, Attachment, NumberSequence
 */

class CreateAuditLogDto {
  constructor(data = {}) {
    this.actorId = data.actorId || null;
    this.actorEmployeeId = data.actorEmployeeId || null;
    this.actorName = data.actorName || null;
    this.actorType = data.actorType || "USER";
    this.action = data.action;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.before = data.before || null;
    this.after = data.after || null;
    this.branchId = data.branchId || null;
    this.ipAddress = data.ipAddress || null;
    this.userAgent = data.userAgent || null;
    this.sessionId = data.sessionId || null;
    this.timestamp = data.timestamp || new Date();
  }

  static fromRequest(req) {
    return new CreateAuditLogDto({
      ...req.body,
      actorId: req.user?._id || req.user?.id,
      ipAddress: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}

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
  CreateAuditLogDto,
  CreateApprovalDto,
  DecideApprovalDto,
  UploadAttachmentDto,
  GenerateNumberSequenceDto,
};
