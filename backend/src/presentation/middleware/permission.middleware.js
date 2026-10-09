const ErrorHelper = require("../../shared/errors/ErrorHelper");
const Role = require("../../infrastructure/database/mongoose/models/Role");
const Permission = require("../../infrastructure/database/mongoose/models/Permission");

/**
 * Standard Permission checking middleware supporting granular permissions and scopes (ALL, BRANCH, ASSIGNED, SELF).
 * Sets req.authz context for use cases and controllers.
 */
const requirePermission = (permissionCode, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(ErrorHelper.unauthorized("Authentication required."));
      }

      const user = req.user;
      const isSuperAdmin = Boolean(
        user.role === "admin" ||
        user.role === "SUPER_ADMIN" ||
        user.roleCode === "SUPER_ADMIN" ||
        user.roleCode === "ADMIN" ||
        user.roleCode === "INTERNAL_ADMIN"
      );

      const userBranchIds = (user.branchIds || [])
        .map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
        .filter(Boolean);
      if (user.branchId) {
        const bId = user.branchId._id ? user.branchId._id.toString() : user.branchId.toString();
        if (bId && !userBranchIds.includes(bId)) userBranchIds.push(bId);
      }

      if (isSuperAdmin) {
        req.authz = {
          isSuperAdmin: true,
          userBranchIds,
          scopes: ["ALL"],
          scopeFilter: {},
        };
        return next();
      }

      let allowedScopes = [];
      let hasPermission = false;

      // 1. Check permissions directly attached to user document
      if (Array.isArray(user.permissions)) {
        if (user.permissions.includes(permissionCode) || user.permissions.includes("*") || user.permissions.includes("ALL")) {
          hasPermission = true;
          allowedScopes.push("BRANCH");
        }
      } else if (user.permissions && typeof user.permissions === "object") {
        if (user.permissions[permissionCode] === true || user.permissions["*"] === true || user.permissions["ALL"] === true) {
          hasPermission = true;
          allowedScopes.push("BRANCH");
        }
      }

      // 2. Query roles if roleIds or roleCode exist
      const rIds = (user.roleIds || []).map((id) => (id && id._id ? id._id : id)).filter(Boolean);
      const roleCodes = [user.roleCode, user.role?.toUpperCase(), user.role].filter(Boolean);

      const roles = await Role.find({
        $or: [
          ...(rIds.length > 0 ? [{ _id: { $in: rIds } }] : []),
          ...(roleCodes.length > 0 ? [{ code: { $in: roleCodes } }] : []),
        ],
        isActive: true,
      }).populate("grants.permissionId");

      for (const role of roles) {
        if (role.code === "SUPER_ADMIN" || role.code === "ADMIN") {
          hasPermission = true;
          allowedScopes.push("ALL");
          break;
        }
        if (Array.isArray(role.permissions)) {
          for (const p of role.permissions) {
            if (p === permissionCode || p === "*" || p === "ALL") {
              hasPermission = true;
              allowedScopes.push("BRANCH");
            }
          }
        }
        if (role.grants && role.grants.length > 0) {
          for (const grant of role.grants) {
            const code = grant.permissionCode || (typeof grant.permissionId === "object" && grant.permissionId ? grant.permissionId.code : grant.permissionId);
            if (code === permissionCode || code === "ALL" || code === "*") {
              hasPermission = true;
              allowedScopes.push(grant.scope || "BRANCH");
            }
          }
        }
      }

      // 3. Fallback for default role types
      if (!hasPermission && (user.role === "manager" || user.role === "designer" || user.role === "operator")) {
        hasPermission = true;
        allowedScopes.push("BRANCH");
      }

      if (!hasPermission) {
        return next(
          ErrorHelper.forbidden(`Permission denied: You do not have '${permissionCode}'.`)
        );
      }

      const scopeFilter = {};
      if (allowedScopes.includes("ALL")) {
        // Unrestricted scope
      } else if (allowedScopes.includes("BRANCH")) {
        const branchField = typeof options === "object" ? options.branchField || "branchId" : "branchId";
        scopeFilter[branchField] = { $in: userBranchIds };
      } else if (allowedScopes.includes("ASSIGNED") || allowedScopes.includes("SELF")) {
        const selfField = typeof options === "object" ? options.selfField || "designerId" : "designerId";
        scopeFilter[selfField] = user.employeeId || user._id;
      }

      req.authz = {
        isSuperAdmin: allowedScopes.includes("ALL"),
        userBranchIds,
        authorizedBranches: userBranchIds,
        authorizedBranchIds: userBranchIds,
        scopes: allowedScopes,
        scopeFilter,
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
};

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
    if (
      req.user.role === "admin" ||
      req.user.role === "SUPER_ADMIN" ||
      req.user.roleCode === "SUPER_ADMIN"
    ) {
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
  requirePermission,
  authorizePermission,
};
