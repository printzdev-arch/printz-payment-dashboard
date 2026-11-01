const asyncHandler = require("../../../utils/asyncHandler");
const ResponseHelper = require("../../../utils/ResponseHelper");
const ProductionOrderService = require("../services/productionOrder.service");
const ProductionPlanningService = require("../services/productionPlanning.service");
const QualityCheckService = require("../services/qualityCheck.service");

/**
 * Production Orders Controller
 *
 * Production orders are created automatically when a job is approved, so
 * there is no create handler here.
 */
const planProduction = asyncHandler(async (req, res) => {
  const result = await ProductionPlanningService.planProduction(
    req.params.id,
    req.body,
    req.user
  );

  const isDraft =
    req.body && (req.body.isDraft === true || String(req.body.action || "").toUpperCase() === "DRAFT");

  return ResponseHelper.created(
    res,
    result,
    isDraft ? "Production plan saved as draft" : "Production plan confirmed successfully"
  );
});

const getProductionOrders = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await ProductionOrderService.findAll(req.query, req.user);
  return ResponseHelper.paginated(
    res,
    items,
    total,
    page,
    limit,
    "Production orders retrieved successfully"
  );
});

// Dashboard KPI counts (counted in the database, not from a paged list)
const getProductionStats = asyncHandler(async (req, res) => {
  const stats = await ProductionOrderService.getStats(req.query, req.user);
  return ResponseHelper.ok(res, "Production statistics retrieved successfully", stats);
});

const getProductionOrderById = asyncHandler(async (req, res) => {
  const order = await ProductionOrderService.findById(req.params.id, req.user);
  return ResponseHelper.ok(res, "Production order retrieved successfully", order);
});

const updateProductionOrder = asyncHandler(async (req, res) => {
  const updated = await ProductionOrderService.update(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Production order updated successfully", updated);
});

const holdProductionOrder = asyncHandler(async (req, res) => {
  const held = await ProductionOrderService.hold(req.params.id, req.body.reason, req.user);
  return ResponseHelper.ok(res, "Production order placed on hold", held);
});

// Signature is resume(id, reason, user): the old code passed the user as the reason
const resumeProductionOrder = asyncHandler(async (req, res) => {
  const resumed = await ProductionOrderService.resume(
    req.params.id,
    (req.body && req.body.reason) || "",
    req.user
  );
  return ResponseHelper.ok(res, "Production order resumed successfully", resumed);
});

const cancelProductionOrder = asyncHandler(async (req, res) => {
  const cancelled = await ProductionOrderService.cancel(req.params.id, req.body.reason, req.user);
  return ResponseHelper.ok(res, "Production order cancelled successfully", cancelled);
});

const updateOperations = asyncHandler(async (req, res) => {
  const ops = await ProductionOrderService.updateOperations(
    req.params.id,
    req.body.operations || req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Operations updated successfully", ops);
});

// GET /production/planning?mode=PLAN|REVISE&branchId=...
// req.query carries `mode`; req.user is needed for branch scoping.
const getPlanningJobs = asyncHandler(async (req, res) => {
  const eligibleJobs = await ProductionPlanningService.getEligibleJobsForPlanning(
    req.query.branchId,
    req.query,
    req.user
  );
  return ResponseHelper.ok(res, "Eligible jobs for planning retrieved successfully", {
    eligibleJobs,
    count: eligibleJobs.length,
  });
});

// GET /production/planning/:id (production order id, job item id, job id or job number)
const getPlanningJobById = asyncHandler(async (req, res) => {
  const jobItem = await ProductionPlanningService.getEligibleJobById(req.params.id, req.user);
  return ResponseHelper.ok(res, "Job item details retrieved for planning", { jobItem });
});

const getQcHistory = asyncHandler(async (req, res) => {
  const result = await QualityCheckService.getHistoryForOrder(req.params.id, req.user);
  return ResponseHelper.ok(res, "QC history retrieved successfully", result);
});

module.exports = {
  planProduction,
  getProductionOrders,
  getProductionStats,
  getProductionOrderById,
  updateProductionOrder,
  holdProductionOrder,
  resumeProductionOrder,
  cancelProductionOrder,
  updateOperations,
  getPlanningJobs,
  getPlanningJobById,
  getQcHistory,
};