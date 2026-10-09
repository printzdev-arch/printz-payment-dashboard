const productOrderService = require("../../../application/services/product-order/productOrderService");
const { asyncHandler, ResponseHelper } = require("../../../shared");

function extractAuthContext(req) {
  return {
    user: req.user,
    scopes: req.authz?.scopes || [],
    authorizedBranchIds: req.authz?.authorizedBranches || req.authorizedBranchIds || [],
    isSuperAdmin: req.authz?.isSuperAdmin || req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN",
  };
}

const createDraft = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const result = await productOrderService.createDraft(req.body, authContext);
  return ResponseHelper.success(res, result, "Draft product order created successfully", 201);
});

const updateDraftItems = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;
  const authContext = extractAuthContext(req);
  const result = await productOrderService.updateDraftItems(id, items, authContext);
  return ResponseHelper.success(res, result, "Draft product order items updated successfully");
});

const updateDraft = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await productOrderService.updateDraft(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Draft product order updated successfully");
});

const submitOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await productOrderService.submitOrder(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Product order submitted for approval successfully");
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await productOrderService.cancelOrder(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Product order cancelled successfully");
});

const getPendingApprovals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);
  const result = await productOrderService.getPendingApprovals(pagination, authContext);
  return ResponseHelper.success(res, result, "Pending approval product orders retrieved successfully");
});

const approveOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await productOrderService.approveOrder(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Product order approved and stock transfer generated successfully");
});

const rejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await productOrderService.rejectOrder(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Product order rejected successfully");
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await productOrderService.getOrderById(id, authContext);
  return ResponseHelper.success(res, result, "Product order retrieved successfully");
});

const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, requestingBranchId, branchId, status, from, to, q } = req.query;
  const filters = { requestingBranchId, branchId, status, from, to, q };
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);
  const result = await productOrderService.getOrders(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Product orders retrieved successfully");
});

module.exports = {
  createDraft,
  updateDraftItems,
  updateDraft,
  submitOrder,
  cancelOrder,
  getPendingApprovals,
  approveOrder,
  rejectOrder,
  getOrderById,
  getOrders,
};
