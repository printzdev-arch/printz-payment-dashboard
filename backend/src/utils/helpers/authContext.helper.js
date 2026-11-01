/**
 * Derive auth context from the request.
 * Reads from req.authz (set by requirePermission middleware) — never trusts the request body/query.
 */
const getAuthContext = (req) => {
  const user = req.user || {};
  const userBranchIds = (user.branchIds || [])
    .map((b) => (b._id ? b._id.toString() : b.toString()))
    .filter(Boolean);

  if (user.branchId) {
    const sId = user.branchId._id ? user.branchId._id.toString() : user.branchId.toString();
    if (!userBranchIds.includes(sId)) userBranchIds.push(sId);
  }

  const isSuperAdmin = Boolean(
    req.authz?.isSuperAdmin ||
    user.role === "admin" ||
    user.role === "SUPER_ADMIN" ||
    user.roleCode === "SUPER_ADMIN" ||
    user.roleCode === "ADMIN" ||
    user.roleCode === "INTERNAL_ADMIN"
  );

  return {
    isSuperAdmin,
    authorizedBranchIds: req.authz?.userBranchIds || userBranchIds,
    scopes: req.authz?.scopes || (isSuperAdmin ? ["ALL"] : ["BRANCH"]),
    scopeFilter: req.authz?.scopeFilter,
    userId: (user._id || user.id || "").toString(),
    employeeId: user.employeeId ? user.employeeId.toString() : null,
  };
};

module.exports = { getAuthContext };
