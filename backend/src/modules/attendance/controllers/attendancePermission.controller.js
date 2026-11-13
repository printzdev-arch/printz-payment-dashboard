const attendancePermissionService = require("../services/attendancePermission.service");
const { asyncHandler, ResponseHelper } = require("../../../utils");

const getAuthContext = (req) => {
  const user = req.user || {};
  const userBranchIds = (user.branchIds || [])
    .map((b) => (b._id ? b._id.toString() : b.toString()))
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
 * POST /api/v1/attendance/permissions (Record Permission - Automatically Granted)
 */
const createPermission = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const actorId = req.user?._id || null;
  const permission = await attendancePermissionService.createPermission(req.body, actorId, authContext);
  return ResponseHelper.cleanCreated(res, "Permission recorded successfully.", permission);
});

/**
 * GET /api/v1/attendance/permissions
 */
const getPermissions = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const filters = {
    branchId: req.query.branchId,
    employeeId: req.query.employeeId,
    status: req.query.status,
    permissionDate: req.query.permissionDate,
    date: req.query.date,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    year: req.query.year,
    month: req.query.month,
  };

  const pagination = {
    page: Math.max(1, parseInt(req.query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50)),
  };

  const result = await attendancePermissionService.getPermissions(filters, pagination, authContext);
  return ResponseHelper.cleanOk(res, "Permission records retrieved successfully.", result);
});

/**
 * GET /api/v1/attendance/permissions/balance
 * GET /api/v1/attendance/permissions/balance/:employeeId
 */
const getEmployeeBalance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const employeeId = req.params.employeeId || req.query.employeeId;
  const { year, month } = req.query;
  const balance = await attendancePermissionService.getEmployeeBalance(employeeId, year, month, authContext);
  return ResponseHelper.cleanOk(res, "Employee permission balance retrieved successfully.", balance);
});

/**
 * GET /api/v1/attendance/permissions/:id
 */
const getPermissionById = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const permission = await attendancePermissionService.getPermissionById(req.params.id, authContext);
  return ResponseHelper.cleanOk(res, "Permission record retrieved successfully.", permission);
});

/**
 * PUT /api/v1/attendance/permissions/:id (Update Permission & Recalculate Allowance)
 */
const updatePermission = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const actorId = req.user?._id || null;
  const permission = await attendancePermissionService.updatePermission(req.params.id, req.body, actorId, authContext);
  return ResponseHelper.cleanOk(res, "Permission record updated successfully.", permission);
});

/**
 * DELETE /api/v1/attendance/permissions/:id (Delete / Cancel Permission & Restore Allowance)
 */
const deletePermission = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const actorId = req.user?._id || null;
  const result = await attendancePermissionService.deletePermission(req.params.id, actorId, authContext);
  return ResponseHelper.cleanOk(res, result.message, result.permission);
});

module.exports = {
  createPermission,
  getPermissions,
  getEmployeeBalance,
  getPermissionById,
  updatePermission,
  deletePermission,
};
