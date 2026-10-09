const stockTransferService = require("../../../application/services/product-order/stockTransferService");
const { asyncHandler, ResponseHelper } = require("../../../shared");

function extractAuthContext(req) {
  return {
    user: req.user,
    scopes: req.authz?.scopes || [],
    authorizedBranchIds: req.authz?.authorizedBranches || req.authorizedBranchIds || [],
    isSuperAdmin: req.authz?.isSuperAdmin || req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN",
  };
}

const dispatchTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await stockTransferService.dispatchTransfer(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Stock transfer dispatched from warehouse successfully");
});

const receiveTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await stockTransferService.receiveTransfer(id, req.body, authContext);
  const message = result.hasShortage
    ? "Stock transfer received at branch with shortage logged"
    : "Stock transfer received and inventory updated successfully";
  return ResponseHelper.success(res, result, message);
});

const cancelTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await stockTransferService.cancelTransfer(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Stock transfer cancelled successfully");
});

const getTransferById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await stockTransferService.getTransferById(id, authContext);
  return ResponseHelper.success(res, result, "Stock transfer retrieved successfully");
});

const getTransfers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, fromBranchId, toBranchId, status, productOrderId, from, to, q } = req.query;
  const filters = { fromBranchId, toBranchId, status, productOrderId, from, to, q };
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);
  const result = await stockTransferService.getTransfers(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Stock transfers retrieved successfully");
});

module.exports = {
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  getTransferById,
  getTransfers,
};
