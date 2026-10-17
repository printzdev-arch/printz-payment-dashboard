const asyncHandler = require("../../utils/asyncHandler");
const ResponseHelper = require("../../utils/ResponseHelper");
const JobEstimateService = require("../../services/job-order/jobEstimate.service");

/**
 * Job Estimation Controller
 */
const estimate = asyncHandler(async (req, res) => {
  const result = await JobEstimateService.estimate(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Job estimate recorded and submitted for approval", result);
});

const approveEstimate = asyncHandler(async (req, res) => {
  const result = await JobEstimateService.approveEstimate(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Job estimate approved successfully", result);
});

const rejectEstimate = asyncHandler(async (req, res) => {
  const result = await JobEstimateService.rejectEstimate(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Job estimate rejected", result);
});

module.exports = {
  estimate,
  approveEstimate,
  rejectEstimate,
};
