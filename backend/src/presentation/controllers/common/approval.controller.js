const approvalService = require("../../../application/services/common/approval.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");

function extractAuthContext(req) {
  return {
    user: req.user,
    scopes: req.authz?.scopes || [],
    authorizedBranchIds: req.authz?.authorizedBranches || req.authorizedBranchIds || [],
    isSuperAdmin: req.authz?.isSuperAdmin || req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN",
  };
}

const getApprovals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, referenceType, branchId } = req.query;

  const filters = {};
  if (status) filters.status = String(status).trim().toUpperCase();
  if (referenceType) filters.referenceType = String(referenceType).trim().toUpperCase();
  if (branchId) filters.branchId = String(branchId).trim();

  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await approvalService.getApprovals(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Approvals retrieved successfully");
});

const getApprovalById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const approval = await approvalService.getApprovalById(id, authContext);
  return ResponseHelper.success(res, approval, "Approval details retrieved successfully");
});

const approve = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body || {};
  const authContext = extractAuthContext(req);

  const result = await approvalService.approve(
    id,
    { approverId: req.user?._id || req.user?.id, comments },
    authContext
  );
  return ResponseHelper.success(res, result, "Approval request approved successfully");
});

const reject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body || {};
  const authContext = extractAuthContext(req);

  const result = await approvalService.reject(
    id,
    { approverId: req.user?._id || req.user?.id, comments },
    authContext
  );
  return ResponseHelper.success(res, result, "Approval request rejected successfully");
});

const cancel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body || {};
  const authContext = extractAuthContext(req);

  const result = await approvalService.cancel(
    id,
    { userId: req.user?._id || req.user?.id, comments },
    authContext
  );
  return ResponseHelper.success(res, result, "Approval request cancelled successfully");
});

const getCounts = asyncHandler(async (req, res) => {
  const { branchId, referenceType } = req.query;
  const filters = {};
  if (branchId) filters.branchId = String(branchId).trim();
  if (referenceType) filters.referenceType = String(referenceType).trim().toUpperCase();

  const authContext = extractAuthContext(req);
  const counts = await approvalService.getApprovalCounts(filters, authContext);
  return ResponseHelper.success(res, counts, "Approval counts retrieved successfully");
});

module.exports = {
  getApprovals,
  getApprovalById,
  approve,
  reject,
  cancel,
  getCounts,
};
