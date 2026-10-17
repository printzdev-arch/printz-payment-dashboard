const asyncHandler = require("../../utils/asyncHandler");
const ResponseHelper = require("../../utils/ResponseHelper");
const ProductionOrderService = require("../../services/production/productionOrder.service");
const ProductionPlanningService = require("../../services/production/productionPlanning.service");

/**
 * Production Orders Controller
 */
const planProduction = asyncHandler(async (req, res) => {
  const result = await ProductionPlanningService.planProduction(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.created(
    res,
    result,
    "Production order(s) planned and queued successfully"
  );
});

const getProductionOrders = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await ProductionOrderService.findAll(req.query);
  return ResponseHelper.paginated(
    res,
    items,
    total,
    page,
    limit,
    "Production orders retrieved successfully"
  );
});

const getProductionOrderById = asyncHandler(async (req, res) => {
  const order = await ProductionOrderService.findById(req.params.id);
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

const resumeProductionOrder = asyncHandler(async (req, res) => {
  const resumed = await ProductionOrderService.resume(req.params.id, req.user);
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

const getPlanningJobs = asyncHandler(async (req, res) => {
  const eligibleJobs = await ProductionPlanningService.getEligibleJobsForPlanning(
    req.query.branchId,
    req.query
  );
  return ResponseHelper.ok(res, "Eligible jobs for planning retrieved successfully", {
    eligibleJobs,
    count: eligibleJobs.length,
  });
});

const getPlanningJobById = asyncHandler(async (req, res) => {
  const jobItem = await ProductionPlanningService.getEligibleJobById(req.params.id);
  return ResponseHelper.ok(res, "Job item details retrieved for planning", { jobItem });
});

const createProductionOrder = asyncHandler(async (req, res) => {
  const order = await ProductionPlanningService.createProductionOrderDirect(req.body, req.user);
  return ResponseHelper.created(res, order, "Production order created successfully");
});

const getQcHistory = asyncHandler(async (req, res) => {
  const QualityCheckService = require("../../services/production/qualityCheck.service");
  const result = await QualityCheckService.getHistoryForOrder(req.params.id);
  return ResponseHelper.ok(res, "QC history retrieved successfully", result);
});

module.exports = {
  planProduction,
  getProductionOrders,
  getProductionOrderById,
  updateProductionOrder,
  holdProductionOrder,
  resumeProductionOrder,
  cancelProductionOrder,
  updateOperations,
  getPlanningJobs,
  getPlanningJobById,
  createProductionOrder,
  getQcHistory,
};

