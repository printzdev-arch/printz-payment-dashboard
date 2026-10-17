const reportService = require("../../services/common/report.service");
const { asyncHandler, ResponseHelper } = require("../../utils");

const getDashboardSummary = asyncHandler(async (req, res) => {
  let dates = [];
  if (req.query.dates) {
    dates = Array.isArray(req.query.dates) ? req.query.dates : req.query.dates.split(",");
  }
  let branchFilter = null;
  if (req.query.branches) {
    branchFilter = Array.isArray(req.query.branches) ? req.query.branches : req.query.branches.split(",");
  }

  const summary = await reportService.getDashboardSummary({ dates, branchFilter });
  return ResponseHelper.success(res, summary, "Dashboard summary calculated successfully");
});

const getMonthlyRevenue = asyncHandler(async (req, res) => {
  const year = req.query.year || new Date().getFullYear().toString();
  const branch = req.query.branch || null;
  const result = await reportService.getMonthlyRevenue({ year, branch });
  return ResponseHelper.success(res, result, "Monthly revenue report generated");
});

module.exports = {
  getDashboardSummary,
  getMonthlyRevenue,
};
