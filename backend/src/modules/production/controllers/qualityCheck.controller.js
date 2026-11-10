const asyncHandler = require("../../../utils/helpers/asyncHandler");
const ResponseHelper = require("../../../utils/helpers/ApiResponseHelper");
const QualityCheckService = require("../services/qualityCheck.service");

/**
 * Quality Control Controller
 */
const getPendingQualityChecks = asyncHandler(async (req, res) => {
  const pendingOrders = await QualityCheckService.getPending(req.query.branchId, req.user);
  return ResponseHelper.ok(
    res,
    "Pending QC production orders retrieved successfully",
    pendingOrders
  );
});

const performQualityCheck = asyncHandler(async (req, res) => {
  const result = await QualityCheckService.performCheck(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.created(res, result, "Quality check recorded successfully");
});

const getQualityChecks = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await QualityCheckService.findAll(req.query, req.user);
  return ResponseHelper.paginated(
    res,
    items,
    total,
    page,
    limit,
    "Quality checks retrieved successfully"
  );
});

const getQualityCheckById = asyncHandler(async (req, res) => {
  const qc = await QualityCheckService.findById(req.params.id, req.user);
  return ResponseHelper.ok(res, "Quality check retrieved successfully", qc);
});

const getQualityCheckReport = asyncHandler(async (req, res) => {
  const report = await QualityCheckService.getReport(req.params.id, req.user);
  return ResponseHelper.ok(res, "QC Report generated successfully", report);
});

const createQualityCheckDirect = asyncHandler(async (req, res) => {
  const targetId = req.body.productionOrderId || req.body.id || req.params.id;
  const result = await QualityCheckService.performCheck(
    targetId,
    req.body,
    req.user
  );
  return ResponseHelper.created(res, result, "Quality check recorded successfully");
});

module.exports = {
  getPendingQualityChecks,
  performQualityCheck,
  createQualityCheckDirect,
  getQualityChecks,
  getQualityCheckById,
  getQualityCheckReport,
};