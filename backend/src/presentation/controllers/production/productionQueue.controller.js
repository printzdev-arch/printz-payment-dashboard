const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const ProductionQueueService = require("../../../application/services/production/productionQueue.service");

/**
 * Production Queue Controller
 */
const getQueue = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await ProductionQueueService.getQueue(
    req.query,
    req.user
  );
  return ResponseHelper.paginated(
    res,
    items,
    total,
    page,
    limit,
    "Production queue operations retrieved successfully"
  );
});

const getQueueCounts = asyncHandler(async (req, res) => {
  const counts = await ProductionQueueService.getQueueCounts(req.query.branchId);
  return ResponseHelper.ok(
    res,
    "Production queue counts retrieved successfully",
    counts
  );
});

module.exports = {
  getQueue,
  getQueueCounts,
};
