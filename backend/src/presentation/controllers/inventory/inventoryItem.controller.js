const inventoryItemService = require("../../../application/services/inventory/inventoryItem.service");
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

const getInventoryItems = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, category, isActive, q } = req.query;
  const filters = { category, isActive, q };
  const pagination = { page: Number(page), limit: Number(limit) };

  const result = await inventoryItemService.getItems(filters, pagination);
  return ResponseHelper.success(res, result, "Inventory items retrieved successfully");
});

const getInventoryItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const item = await inventoryItemService.getItemById(id, authContext);
  return ResponseHelper.success(res, item, "Inventory item details retrieved successfully");
});

const createInventoryItem = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const item = await inventoryItemService.createItem(req.body, authContext);
  return ResponseHelper.success(res, item, "Inventory item created successfully", 201);
});

const updateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const item = await inventoryItemService.updateItem(id, req.body, authContext);
  return ResponseHelper.success(res, item, "Inventory item updated successfully");
});

const deactivateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const item = await inventoryItemService.deactivateItem(id, authContext);
  return ResponseHelper.success(res, item, "Inventory item deactivated successfully");
});

const activateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const item = await inventoryItemService.activateItem(id, authContext);
  return ResponseHelper.success(res, item, "Inventory item activated successfully");
});

module.exports = {
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deactivateInventoryItem,
  activateInventoryItem,
};
