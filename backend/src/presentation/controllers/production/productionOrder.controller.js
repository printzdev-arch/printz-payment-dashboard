const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const ProductionOrderService = require("../../../application/services/production/productionOrder.service");
const ProductionPlanningService = require("../../../application/services/production/productionPlanning.service");

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

module.exports = {
  planProduction,
  getProductionOrders,
  getProductionOrderById,
  updateProductionOrder,
  holdProductionOrder,
  resumeProductionOrder,
  cancelProductionOrder,
  updateOperations,
};
