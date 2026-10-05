const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * Granular permission checking middleware.
 * Admins always bypass permission checks.
 * Managers are checked against req.user.permissions[resource][action].
 *
 * Example: authorizePermission("printers", "create")
 */
const authorizePermission = (resource, action = "read") => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ErrorHelper.unauthorized("Authentication required."));
    }

    // Admins have unrestricted access
    if (req.user.role === "admin") {
      return next();
    }

    // Managers have standard operational access by default unless custom permissions are configured
    if (!req.user.permissions) {
      return next();
    }

    const userPerms = req.user.permissions || {};
    const resourcePerms = userPerms[resource];

    // If resource permission is not defined in userPerms, allow standard access
    if (resourcePerms === undefined) {
      return next();
    }

    // If permission is a boolean (e.g. permissions.printers: true)
    if (typeof resourcePerms === "boolean") {
      if (resourcePerms) return next();
      return next(
        ErrorHelper.forbidden(`Permission denied: You do not have permission for '${resource}'.`)
      );
    }

    // If permission is an object with action flags (e.g. { read: true, create: true })
    if (
      resourcePerms &&
      typeof resourcePerms === "object"
    ) {
      if (resourcePerms[action] === true || resourcePerms[action] === undefined) {
        return next();
      }
      return next(
        ErrorHelper.forbidden(`Permission denied: You do not have '${action}' permission for '${resource}'.`)
      );
    }

    return next();
  };
};

module.exports = {
  authorizePermission,
};
