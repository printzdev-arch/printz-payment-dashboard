const asyncHandler = require("../../../utils/asyncHandler");
const ResponseHelper = require("../../../utils/ResponseHelper");
const ProductionDashboardService = require("../services/productionDashboard.service");

/**
 * Production Dashboard Controller
 */
const getDashboard = asyncHandler(async (req, res) => {
  const data = await ProductionDashboardService.getDashboard(req.query, req.user);
  return ResponseHelper.ok(res, "Dashboard retrieved successfully", data);
});

module.exports = { getDashboard };