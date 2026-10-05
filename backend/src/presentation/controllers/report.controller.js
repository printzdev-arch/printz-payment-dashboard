const GetDashboardSummary = require("../../application/use-cases/reports/GetDashboardSummary");
const GetMonthlyRevenue = require("../../application/use-cases/reports/GetMonthlyRevenue");
const reportRepository = require("../../infrastructure/database/mongoose/repositories/MongoReportRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getDashboardSummaryUseCase = new GetDashboardSummary({ reportRepository });
const getMonthlyRevenueUseCase = new GetMonthlyRevenue({ reportRepository });

const getDashboardSummary = asyncHandler(async (req, res) => {
  let dates = [];
  if (req.query.dates) {
    dates = Array.isArray(req.query.dates) ? req.query.dates : req.query.dates.split(",");
  }
  let branchFilter = null;
  if (req.query.branches) {
    branchFilter = Array.isArray(req.query.branches) ? req.query.branches : req.query.branches.split(",");
  }

  const summary = await getDashboardSummaryUseCase.execute({ dates, branchFilter });
  return ResponseHelper.success(res, summary, "Dashboard summary calculated successfully");
});

const getMonthlyRevenue = asyncHandler(async (req, res) => {
  const year = req.query.year || new Date().getFullYear().toString();
  const branch = req.query.branch || null;
  const result = await getMonthlyRevenueUseCase.execute({ year, branch });
  return ResponseHelper.success(res, result, "Monthly revenue report generated");
});

module.exports = {
  getDashboardSummary,
  getMonthlyRevenue,
};
