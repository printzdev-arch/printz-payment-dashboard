const attachmentService = require("../../services/common/attachment.service");

class UploadAttachment {
  constructor(service = attachmentService) {
    this.service = service;
  }

  async execute(dto, fileBuffer) {
    return this.service.uploadAttachment(dto, fileBuffer);
  }
}

module.exports = UploadAttachment;
