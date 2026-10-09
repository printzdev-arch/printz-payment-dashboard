const purchaseReceiptService = require("../../../application/services/inventory/purchaseReceipt.service");
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

const getPurchaseReceipts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, branchId, from, to, status } = req.query;
  const filters = { branchId, from, to, status };
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await purchaseReceiptService.getReceipts(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Purchase receipts retrieved successfully");
});

const getPurchaseReceiptById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const receipt = await purchaseReceiptService.getReceiptById(id, authContext);
  return ResponseHelper.success(res, receipt, "Purchase receipt details retrieved successfully");
});

const createDraftReceipt = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const receipt = await purchaseReceiptService.createDraft(req.body, authContext);
  return ResponseHelper.success(res, receipt, "Purchase receipt draft created successfully", 201);
});

const updateDraftReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const receipt = await purchaseReceiptService.updateDraft(id, req.body, authContext);
  return ResponseHelper.success(res, receipt, "Purchase receipt draft updated successfully");
});

const postReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const receipt = await purchaseReceiptService.postReceipt(id, authContext);
  return ResponseHelper.success(res, receipt, "Purchase receipt posted successfully and stock updated");
});

const cancelReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const receipt = await purchaseReceiptService.cancelReceipt(id, authContext);
  return ResponseHelper.success(res, receipt, "Purchase receipt cancelled successfully");
});

module.exports = {
  getPurchaseReceipts,
  getPurchaseReceiptById,
  createDraftReceipt,
  updateDraftReceipt,
  postReceipt,
  cancelReceipt,
};
