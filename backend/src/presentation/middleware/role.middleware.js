const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * Role-Based Access Control middleware.
 * Accepts one or more allowed roles e.g. authorizeRoles("admin", "manager")
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ErrorHelper.unauthorized("Authentication required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ErrorHelper.forbidden(`User role '${req.user.role}' is not authorized to access this resource.`)
      );
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
