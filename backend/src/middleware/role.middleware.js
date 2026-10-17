const ApiError = require("../utils/ApiError");

/**
 * Role-Based Access Control middleware.
 * Accepts one or more allowed roles e.g. authorizeRoles("admin", "manager")
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`User role '${req.user.role}' is not authorized to access this resource.`)
      );
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
