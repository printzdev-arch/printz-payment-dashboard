const attendancePolicyService = require("../services/attendancePolicy.service");
const { asyncHandler, ResponseHelper } = require("../../../utils");

const getAuthContext = (req) => {
  const user = req.user || {};
  const userBranchIds = (user.branchIds || [])
    .filter(Boolean).map((b) => (b._id ? b._id.toString() : b.toString()))
    .filter(Boolean);

  if (user.branchId) {
    const sId = user.branchId._id ? user.branchId._id.toString() : user.branchId.toString();
    if (!userBranchIds.includes(sId)) userBranchIds.push(sId);
  }

  const roleNorm = (user.roleCode || user.role || "").toString().toLowerCase().trim();
  const isSuperAdmin = Boolean(
    req.authz?.isSuperAdmin ||
    roleNorm === "super_admin" ||
    roleNorm === "internal_admin" ||
    (Array.isArray(user.permissions) && user.permissions.includes("*")) ||
    (roleNorm === "admin" && userBranchIds.length === 0)
  );

  const effectiveBranchIds =
    req.authz?.userBranchIds && req.authz.userBranchIds.length > 0
      ? req.authz.userBranchIds
      : userBranchIds;

  return {
    isSuperAdmin,
    authorizedBranchIds: effectiveBranchIds,
    scopes: req.authz?.scopes || (isSuperAdmin ? ["ALL"] : ["BRANCH"]),
    userId: (user._id || user.id || "").toString(),
    employeeId: user.employeeId ? user.employeeId.toString() : null,
    role: user.roleCode || user.role || "EMPLOYEE",
  };
};

/**
 * GET /api/attendance-policies
 */
const getPolicies = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const filters = {
    branchId: req.query.branchId,
    isActive: req.query.isActive !== undefined ? req.query.isActive : req.query.status,
    search: req.query.q || req.query.search,
  };

  const pagination = {
    page: Math.max(1, parseInt(req.query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50)),
  };

  const result = await attendancePolicyService.getPolicies(filters, pagination, authContext);
  return ResponseHelper.cleanOk(res, "Attendance policies retrieved successfully.", result);
});

/**
 * GET /api/attendance-policies/:id
 */
const getPolicyById = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const policy = await attendancePolicyService.getPolicyById(req.params.id, authContext);
  return ResponseHelper.cleanOk(res, "Attendance policy retrieved successfully.", policy);
});

/**
 * POST /api/attendance-policies
 */
const createPolicy = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const policy = await attendancePolicyService.createPolicy(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanCreated(res, policy, "Attendance policy created successfully.");
});

/**
 * PUT /api/attendance-policies/:id
 */
const updatePolicy = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const updated = await attendancePolicyService.updatePolicy(req.params.id, req.body, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Attendance policy updated successfully.", updated);
});

/**
 * PATCH /api/attendance-policies/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const isActive = req.body.isActive !== undefined ? req.body.isActive : (req.body.status === "ACTIVE" || req.body.status === true);
  const updated = await attendancePolicyService.updateStatus(req.params.id, isActive, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, `Attendance policy ${isActive ? "activated" : "deactivated"} successfully.`, updated);
});

/**
 * DELETE /api/attendance-policies/:id
 */
const deletePolicy = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await attendancePolicyService.deletePolicy(req.params.id, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Attendance policy deleted successfully.", result);
});

module.exports = {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  updateStatus,
  deletePolicy,
};

