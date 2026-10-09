const attachmentService = require("../../../application/services/common/attachment.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ErrorHelper.badRequest("No file uploaded. Please provide a file under form field 'file'");
  }

  const { entityType, entityId } = req.body;
  if (!entityType || !entityId) {
    throw ErrorHelper.badRequest("entityType and entityId are required fields in the upload request");
  }

  const attachment = await attachmentService.uploadAttachment({
    fileBuffer: req.file.buffer,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    entityType,
    entityId,
    uploadedBy: req.user?._id || req.user?.id,
  });

  return ResponseHelper.success(
    res,
    attachment,
    attachment.isDuplicate ? "Existing duplicate attachment reused" : "Attachment uploaded successfully",
    attachment.isDuplicate ? 200 : 201
  );
});

const getAttachments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, entityType, entityId } = req.query;

  const filters = {};
  if (entityType) filters.entityType = String(entityType).trim();
  if (entityId) filters.entityId = entityId;

  const result = await attachmentService.getAttachments(filters, {
    page: Number(page),
    limit: Number(limit),
  });

  return ResponseHelper.success(res, result, "Attachments retrieved successfully");
});

const getAttachmentUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { download } = req.query;
  const { attachment, filePath } = await attachmentService.getAttachmentFilePath(id);

  if (download === "true" || download === "1") {
    return res.download(filePath, attachment.fileName);
  }

  // Return download URL info along with metadata
  const host = req.get("host");
  const protocol = req.protocol;
  const downloadUrl = `${protocol}://${host}/api/attachments/${id}/url?download=true`;

  return ResponseHelper.success(
    res,
    {
      attachment,
      downloadUrl,
    },
    "Attachment URL retrieved successfully"
  );
});

const deleteAttachment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await attachmentService.deleteAttachment(id, req.user?._id || req.user?.id);
  return ResponseHelper.success(res, result, "Attachment deleted successfully");
});

module.exports = {
  uploadAttachment,
  getAttachments,
  getAttachmentUrl,
  deleteAttachment,
};
