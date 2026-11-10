const asyncHandler = require("../../../utils/helpers/asyncHandler");
const ResponseHelper = require("../../../utils/helpers/ApiResponseHelper");
const designerPerformanceService = require("../services/designerPerformance.service");
const DesignerPerformanceDto = require("../models/DesignerPerformanceDto");

const getPerformance = asyncHandler(async (req, res) => {
  const performance = await designerPerformanceService.getPerformance(req.query, req.user);
  return ResponseHelper.ok(
    res,
    "Designer performance retrieved successfully",
    DesignerPerformanceDto.toResponseList(performance)
  );
});

const getPerformanceTrend = asyncHandler(async (req, res) => {
  const trend = await designerPerformanceService.getPerformanceTrend(
    req.params.employeeId,
    req.query,
    req.user
  );
  return ResponseHelper.ok(
    res,
    "Designer performance trend retrieved successfully",
    DesignerPerformanceDto.toTrendResponse(trend)
  );
});

module.exports = {
  getPerformance,
  getPerformanceTrend,
};
