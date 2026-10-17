const asyncHandler = require("../../utils/asyncHandler");
const ResponseHelper = require("../../utils/ResponseHelper");
const EstimateService = require("../../services/estimate/estimate.service");

/**
 * Commercial Estimate Controller
 */
const createEstimate = asyncHandler(async (req, res) => {
  const estimate = await EstimateService.createEstimate(req.body, req.user);
  return ResponseHelper.created(res, estimate, "Estimate created successfully");
});

const getEstimates = asyncHandler(async (req, res) => {
  const result = await EstimateService.listEstimates(req.query, req.user);
  return ResponseHelper.paginated(
    res,
    result.items,
    result.total,
    result.page,
    result.limit,
    "Estimates retrieved successfully"
  );
});

const getEstimateById = asyncHandler(async (req, res) => {
  const estimate = await EstimateService.getEstimateById(req.params.id);
  return ResponseHelper.ok(res, "Estimate retrieved successfully", estimate);
});

const updateEstimate = asyncHandler(async (req, res) => {
  const estimate = await EstimateService.updateEstimate(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Estimate updated successfully", estimate);
});

module.exports = {
  createEstimate,
  getEstimates,
  getEstimateById,
  updateEstimate,
};
