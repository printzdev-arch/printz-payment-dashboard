const ApiError = require("../utils/ApiError");

/**
 * Role-Based Access Control middleware.
 * Accepts one or more allowed roles e.g. authorizeRoles("ADMIN", "HR_ADMIN")
 */
const authorizeRoles = (...roles) => {
  const allowed = roles.map((r) => String(r).toUpperCase().trim());

  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required."));
    }

    const roleCodes = [];
    if (req.user.role) roleCodes.push(String(req.user.role).toUpperCase().trim());
    if (req.user.roleCode) roleCodes.push(String(req.user.roleCode).toUpperCase().trim());
    if (Array.isArray(req.user.roles)) {
      req.user.roles.forEach((r) => {
        if (typeof r === "string") roleCodes.push(r.toUpperCase().trim());
        else if (r && (r.code || r.name)) roleCodes.push(String(r.code || r.name).toUpperCase().trim());
      });
    }

    const isSuperAdmin =
      Boolean(req.authz?.isSuperAdmin) ||
      roleCodes.includes("SUPER_ADMIN") ||
      roleCodes.includes("INTERNAL_ADMIN");

    if (isSuperAdmin || allowed.some((r) => roleCodes.includes(r))) {
      return next();
    }

    return next(
      ApiError.forbidden(
        `User role '${req.user.roleCode || req.user.role || "UNKNOWN"}' is not authorized to access this resource.`
      )
    );
  };
};

module.exports = {
  authorizeRoles,
};

