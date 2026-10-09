/**
 * Attachment Domain Entity
 */
class Attachment {
  constructor({
    id,
    _id,
    entityType,
    entityId,
    fileName,
    mimeType,
    size,
    checksum,
    storageProvider = "LOCAL",
    storageKey,
    uploadedBy = null,
    uploadedAt = new Date(),
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.entityType = entityType; // e.g. "JOB_ORDER", "PRODUCT_ORDER", "SAMPLE"
    this.entityId = entityId;
    this.fileName = fileName;
    this.mimeType = mimeType;
    this.size = Number(size) || 0; // Bytes
    this.checksum = checksum; // SHA256 hex string
    this.storageProvider = storageProvider; // "LOCAL" | "S3" | "AZURE"
    this.storageKey = storageKey;
    this.uploadedBy = uploadedBy;
    this.uploadedAt = uploadedAt ? new Date(uploadedAt) : new Date();
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  isImage() {
    return this.mimeType && this.mimeType.startsWith("image/");
  }

  isPdf() {
    return this.mimeType === "application/pdf";
  }
}

module.exports = Attachment;
