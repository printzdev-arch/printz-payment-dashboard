const asyncHandler = require("../../../utils/helpers/asyncHandler");
const ResponseHelper = require("../../../utils/helpers/ApiResponseHelper");
const ProductionReportService = require("../services/productionReport.service");

/**
 * Production Reports Controller
 */
const listReports = asyncHandler(async (req, res) => {
  return ResponseHelper.ok(res, "Reports retrieved successfully", ProductionReportService.listReports());
});

const getReport = asyncHandler(async (req, res) => {
  const data = await ProductionReportService.getReport(req.params.type, req.query, req.user);
  return ResponseHelper.ok(res, "Report generated successfully", data);
});

const exportReport = asyncHandler(async (req, res) => {
  const file = await ProductionReportService.exportCsv(req.params.type, req.query, req.user);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  return res.status(200).send(file.content);
});

module.exports = { listReports, getReport, exportReport };