/**
 * Job File DTOs (Module 06)
 */

class FileUploadDto {
  constructor(data = {}) {
    this.fileCategory = data.fileCategory || "REFERENCE";
    this.jobItemId = data.jobItemId || null;
    this.fileName = data.fileName || "file";
    this.fileUrl = data.fileUrl || "";
    this.fileSize = Number(data.fileSize) || 0;
    this.mimeType = data.mimeType || "";
  }
}

module.exports = {
  FileUploadDto,
};
