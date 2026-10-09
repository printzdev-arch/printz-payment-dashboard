const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const attachmentRepository = require("../../../infrastructure/database/mongoose/repositories/common/AttachmentRepository");
const auditLogService = require("./auditLog.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "ai",
  "psd",
  "cdr",
  "zip",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

class AttachmentService {
  constructor(repository = attachmentRepository) {
    this.repository = repository;
    if (!fs.existsSync(UPLOAD_ROOT)) {
      fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    }
  }

  /**
   * Upload and register an attachment file.
   * Handles deduplication via SHA256 checksum per entity.
   */
  async uploadAttachment({
    fileBuffer,
    fileName,
    mimeType,
    size,
    entityType,
    entityId,
    uploadedBy,
  }) {
    if (!fileBuffer || !fileName || !entityType || !entityId) {
      throw ErrorHelper.badRequest("fileBuffer, fileName, entityType, and entityId are required");
    }

    if (size > MAX_FILE_SIZE) {
      throw ErrorHelper.badRequest(`File size exceeds 25 MB limit (${(size / 1024 / 1024).toFixed(2)} MB)`);
    }

    const ext = path.extname(fileName).replace(".", "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw ErrorHelper.badRequest(
        `File extension '.${ext}' is not allowed. Supported types: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`
      );
    }

    // Compute SHA256 checksum
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Check for duplicate on same entity
    const existing = await this.repository.findByChecksumAndEntity(checksum, entityType, entityId);
    if (existing) {
      return {
        ...existing,
        isDuplicate: true,
        message: "Identical file already attached to this entity",
      };
    }

    // Storage key: <entityType>/<entityId>/<uuid>-<fileName>
    const uuid = crypto.randomUUID();
    const sanitizedFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${entityType}/${entityId}/${uuid}-${sanitizedFileName}`;

    // Write file to local disk
    const targetFilePath = path.join(UPLOAD_ROOT, storageKey);
    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetFilePath, fileBuffer);

    const attachment = await this.repository.create({
      entityType: String(entityType).trim(),
      entityId,
      fileName: sanitizedFileName,
      mimeType: mimeType || "application/octet-stream",
      size,
      checksum,
      storageProvider: "LOCAL",
      storageKey,
      uploadedBy,
      uploadedAt: new Date(),
    });

    await auditLogService.log({
      actorId: uploadedBy,
      action: "SAMPLE_UPLOAD",
      entityType: "ATTACHMENT",
      entityId: attachment._id,
      after: {
        attachmentId: attachment._id,
        fileName: sanitizedFileName,
        entityType,
        entityId,
        size,
      },
    });

    return attachment;
  }

  async getAttachments(filters = {}, pagination = {}) {
    return this.repository.findAll(filters, pagination);
  }

  async getAttachmentById(id) {
    const attachment = await this.repository.findById(id);
    if (!attachment) {
      throw ErrorHelper.notFound("Attachment not found");
    }
    return attachment;
  }

  async getAttachmentFilePath(id) {
    const attachment = await this.getAttachmentById(id);
    const filePath = path.join(UPLOAD_ROOT, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      throw ErrorHelper.notFound("Attached file not found on storage");
    }
    return { attachment, filePath };
  }

  async deleteAttachment(id, userId = null) {
    const attachment = await this.getAttachmentById(id);

    // Delete file from disk
    const filePath = path.join(UPLOAD_ROOT, attachment.storageKey);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn("[AttachmentService] Could not unlink file:", err.message);
      }
    }

    const deleted = await this.repository.deleteById(id);

    await auditLogService.log({
      actorId: userId,
      action: "DELETE",
      entityType: "ATTACHMENT",
      entityId: id,
      before: attachment,
    });

    return deleted;
  }
}

module.exports = new AttachmentService();
