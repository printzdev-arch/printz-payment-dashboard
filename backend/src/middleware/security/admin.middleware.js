const ApiError = require("../../utils/errors/ApiError");

/** Admin and Super Admin. Branch managers and everyone else are not admins. */
const isAdminUser = (user = {}) => {
  const role = String(user.role || "").toLowerCase();
  const code = String(user.roleCode || "").toLowerCase();
  return ["admin", "super_admin", "superadmin"].includes(role) || ["admin", "super_admin", "internal_admin"].includes(code);
};

/**
 * Setup is done by an admin: put this after `authenticate` (and any permission check) on a route that
 * creates, changes or deletes setup data. Reading the data stays open to whoever needs it.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized("Authentication required."));
  if (isAdminUser(req.user)) return next();
  return next(ApiError.forbidden("Only an admin can change this setup."));
};

module.exports = { requireAdmin, isAdminUser };
