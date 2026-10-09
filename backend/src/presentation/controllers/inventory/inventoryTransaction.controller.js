const inventoryTransactionService = require("../../../application/services/inventory/inventoryTransaction.service");
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

const getInventoryTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    itemId,
    branchId,
    type,
    consumptionType,
    referenceType,
    referenceId,
    from,
    to,
    performedBy,
  } = req.query;

  const filters = {
    itemId,
    branchId,
    type,
    consumptionType,
    referenceType,
    referenceId,
    from,
    to,
    performedBy,
  };

  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await inventoryTransactionService.getTransactions(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Inventory transactions retrieved successfully");
});

const getInventoryTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const txn = await inventoryTransactionService.getTransactionById(id, authContext);
  return ResponseHelper.success(res, txn, "Inventory transaction details retrieved successfully");
});

const recordAdjustment = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const result = await inventoryTransactionService.recordAdjustment(req.body, authContext);
  return ResponseHelper.success(
    res,
    result,
    result.requiresApproval ? "Stock adjustment submitted for approval" : "Stock adjustment posted successfully",
    201
  );
});

const recordIssue = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const result = await inventoryTransactionService.recordIssue(req.body, authContext);
  return ResponseHelper.success(res, result, "Stock issue posted successfully", 201);
});

const recordOpeningStock = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const result = await inventoryTransactionService.recordOpeningStock(req.body, authContext);
  return ResponseHelper.success(res, result, "Opening stock recorded successfully", 201);
});

module.exports = {
  getInventoryTransactions,
  getInventoryTransactionById,
  recordAdjustment,
  recordIssue,
  recordOpeningStock,
};
