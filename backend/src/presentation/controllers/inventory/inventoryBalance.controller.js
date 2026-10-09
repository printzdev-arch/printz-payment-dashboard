const inventoryBalanceService = require("../../../application/services/inventory/inventoryBalance.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");

function extractAuthContext(req) {
  const userBranches = (req.user?.branchIds && req.user.branchIds.length > 0)
    ? req.user.branchIds
    : (req.user?.branchId ? [req.user.branchId] : []);

  const authorizedBranchIds =
    req.authz?.userBranchIds ||
    req.authz?.authorizedBranches ||
    req.authz?.authorizedBranchIds ||
    req.authorizedBranchIds ||
    userBranches ||
    [];

  return {
    user: req.user,
    scopes: req.authz?.scopes || [],
    authorizedBranchIds,
    isSuperAdmin: Boolean(
      req.authz?.isSuperAdmin ||
      req.user?.role === "admin" ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleCode === "ADMIN" ||
      req.user?.roleCode === "SUPER_ADMIN"
    ),
  };
}

const getInventoryBalances = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, branchId, category, lowStock, q } = req.query;
  const filters = { branchId, category, lowStock, q };
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await inventoryBalanceService.getBalances(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Inventory balances retrieved successfully");
});

const searchPosBalances = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, branchId, q } = req.query;
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await inventoryBalanceService.searchPosBalances({ branchId, q }, pagination, authContext);
  return ResponseHelper.success(res, result, "POS inventory items retrieved successfully");
});

const getWarehouseBalances = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, branchId, q } = req.query;
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await inventoryBalanceService.getWarehouseBalances({ branchId, q }, pagination, authContext);
  return ResponseHelper.success(res, result, "Warehouse inventory balances retrieved successfully");
});

const getLowStockBalances = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, branchId, category, q } = req.query;
  const filters = { branchId, category, q };
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await inventoryBalanceService.getLowStock(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Low stock inventory retrieved successfully");
});

module.exports = {
  getInventoryBalances,
  searchPosBalances,
  getWarehouseBalances,
  getLowStockBalances,
};

