const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const JobFileService = require("../../../application/services/job-order/jobFile.service");

/**
 * Job Files Controller
 */
const uploadFile = asyncHandler(async (req, res) => {
  const fileData = {
    ...req.body,
    fileName: req.file ? req.file.originalname : req.body.fileName,
    fileUrl: req.file ? `/uploads/${req.file.filename}` : req.body.fileUrl,
    fileSize: req.file ? req.file.size : req.body.fileSize,
    mimeType: req.file ? req.file.mimetype : req.body.mimeType,
  };

  const fileDoc = await JobFileService.uploadFile(req.params.id, fileData, req.user);
  return ResponseHelper.created(res, fileDoc, "Job file uploaded successfully");
});

const listFiles = asyncHandler(async (req, res) => {
  const files = await JobFileService.listFiles(req.params.id, req.query.fileCategory, req.user);
  return ResponseHelper.ok(res, "Job files retrieved successfully", files);
});

module.exports = {
  uploadFile,
  listFiles,
};
