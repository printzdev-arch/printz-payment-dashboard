const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobFileRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobFileRepository");
const ProductionStateService = require("../production/productionState.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class JobFileService {
  /**
   * Upload / attach a file to a Job Order.
   */
  static async uploadFile(jobId, fileData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    const {
      fileCategory = "REFERENCE",
      jobItemId = null,
      fileName,
      fileUrl = "",
      attachmentId = null,
      fileSize = 0,
      mimeType = "",
    } = fileData;

    if (!fileName) {
      throw ErrorHelper.badRequest("File name is required.");
    }

    const last = await jobFileRepository.findOne({
      jobOrderId: job._id,
      fileCategory,
    });
    const versionNo = last ? last.versionNo + 1 : 1;

    const fileDoc = await jobFileRepository.create({
      jobOrderId: job._id,
      jobItemId: jobItemId || null,
      fileCategory,
      attachmentId: attachmentId || null,
      fileUrl,
      fileName,
      fileSize: Number(fileSize) || 0,
      mimeType,
      versionNo,
      uploadedBy: user._id,
      uploadedAt: new Date(),
    });

    await ProductionStateService.logAudit({
      action: "CREATE",
      resource: "JobFile",
      resourceId: fileDoc._id,
      user,
      branchId: job.branchId,
      details: { fileName, fileCategory, versionNo },
    });

    return fileDoc;
  }

  /**
   * List files for a Job Order.
   */
  static async listFiles(jobId, fileCategory = null, user = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    return jobFileRepository.findByJobOrderId(job._id, fileCategory);
  }
}

module.exports = JobFileService;
