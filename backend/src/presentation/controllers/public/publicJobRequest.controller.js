const PublicJobRequestService = require("../../../application/services/public/publicJobRequest.service");
const { PublicJobRequestDto } = require("../../../application/dto/public/PublicJobRequestDto");
const { asyncHandler, ResponseHelper } = require("../../../shared");

/**
 * Handle public customer QR self-service job request
 */
const submitJobRequest = asyncHandler(async (req, res) => {
  const dto = PublicJobRequestDto.fromRequest(req);
  const uploadedFiles = req.files || (req.file ? [req.file] : []);

  const result = await PublicJobRequestService.createJobRequest(dto, uploadedFiles);

  if (result.isDuplicate) {
    return ResponseHelper.success(res, result, "Job request already received (idempotent submission)");
  }

  return ResponseHelper.created(res, result, result.message);
});

/**
 * Get branch QR job-request configuration for authorized employees
 */
const getBranchQrConfig = asyncHandler(async (req, res) => {
  const branchId = req.params.branchId || req.params.id;
  const result = await PublicJobRequestService.getBranchQrConfig(branchId, {
    user: req.user,
  });

  return ResponseHelper.success(
    res,
    result,
    "Branch QR job-request configuration retrieved successfully"
  );
});

module.exports = {
  submitJobRequest,
  getBranchQrConfig,
};
