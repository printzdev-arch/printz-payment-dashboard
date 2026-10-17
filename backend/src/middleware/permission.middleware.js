const ErrorHelper = require("../utils/errors/ErrorHelper");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const ScopeHelper = require("../utils/helpers/scopeHelper");

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
      const userRoleNorm = (user.role || "").toLowerCase();
      const userRoleCodeNorm = (user.roleCode || "").toLowerCase();
      const isSuperAdmin = Boolean(
        userRoleNorm === "admin" ||
        userRoleNorm === "super_admin" ||
        userRoleNorm === "superadmin" ||
        userRoleCodeNorm === "admin" ||
        userRoleCodeNorm === "super_admin" ||
        userRoleCodeNorm === "internal_admin"
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
          authorizedBranches: userBranchIds,
          authorizedBranchIds: userBranchIds,
          scopes: ["ALL"],
          scopeFilter: {},
        };
        return next();
      }

      let allowedScopes = [];
      let hasPermission = false;
      const matchedGrants = [];

      // 1. Check permissions directly attached to user document (array or object)
      if (Array.isArray(user.permissions)) {
        if (
          user.permissions.includes(permissionCode) ||
          user.permissions.includes("*") ||
          user.permissions.includes("ALL") ||
          user.permissions.some((p) => typeof p === "string" && permissionCode.startsWith(p.replace(".*", "")))
        ) {
          hasPermission = true;
          allowedScopes.push("BRANCH");
          matchedGrants.push({ scope: "BRANCH", permissionCode });
        }
      } else if (user.permissions && typeof user.permissions === "object") {
        if (
          user.permissions[permissionCode] === true ||
          user.permissions["*"] === true ||
          user.permissions["ALL"] === true
        ) {
          hasPermission = true;
          allowedScopes.push("BRANCH");
          matchedGrants.push({ scope: "BRANCH", permissionCode });
        }
      }

      // 2. Query roles if roleIds or roleCode exist
      const roleQueries = [];
      if (user.roleIds && user.roleIds.length > 0) {
        roleQueries.push({ _id: { $in: user.roleIds } });
      }
      const roleCodes = [
        user.roleCode,
        user.role,
        user.role?.toUpperCase(),
        user.roleCode?.toUpperCase(),
        userRoleNorm === "manager" ? "BRANCH_MANAGER" : null,
        userRoleNorm === "manager" ? "BRANCH_MANAGER1" : null,
        userRoleNorm === "branch_manager" ? "BRANCH_MANAGER" : null,
        userRoleNorm === "branch_manager" ? "BRANCH_MANAGER1" : null,
      ].filter(Boolean);
      if (roleCodes.length > 0) {
        roleQueries.push({ code: { $in: roleCodes } });
      }

      if (roleQueries.length > 0) {
        const roles = await Role.find({ $or: roleQueries, isActive: true }).populate("grants.permissionId");
        for (const role of roles) {
          if (role.code === "SUPER_ADMIN" || role.code === "ADMIN") {
            hasPermission = true;
            allowedScopes.push("ALL");
            matchedGrants.push({ scope: "ALL", permissionCode });
            break;
          }
          if (Array.isArray(role.permissions)) {
            for (const p of role.permissions) {
              if (p === permissionCode || p === "*" || p === "ALL") {
                hasPermission = true;
                allowedScopes.push("BRANCH");
                matchedGrants.push({ scope: "BRANCH", permissionCode });
              }
            }
          }
          if (role.grants && role.grants.length > 0) {
            for (const grant of role.grants) {
              const perm = grant.permissionId;
              const permObjCode = typeof perm === "object" && perm ? perm.code : perm;
              const gCode = (grant.permissionCode || permObjCode || "").toLowerCase();
              const pCodeLower = permissionCode.toLowerCase();

              if (
                gCode === pCodeLower ||
                gCode === "all" ||
                gCode === "*" ||
                gCode === "can_manage_all" ||
                gCode.startsWith(pCodeLower.split(".")[0])
              ) {
                hasPermission = true;
                const grantScope = grant.scope || "BRANCH";
                allowedScopes.push(grantScope);
                matchedGrants.push({ scope: grantScope, permissionCode });
              }
            }
          }
        }
      }

      // 3. Fallback for operational roles when explicit permissions/grants are unassigned
      if (!hasPermission) {
        if (userRoleNorm === "manager" || userRoleNorm === "branch_manager") {
          hasPermission = true;
          allowedScopes.push("BRANCH");
          matchedGrants.push({ scope: "BRANCH", permissionCode });
        } else if (
          userRoleNorm === "designer" &&
          (permissionCode.startsWith("design.") || permissionCode.startsWith("job.") || permissionCode.startsWith("customer."))
        ) {
          hasPermission = true;
          allowedScopes.push(permissionCode.startsWith("design.") ? "ASSIGNED" : "BRANCH");
          matchedGrants.push({ scope: permissionCode.startsWith("design.") ? "ASSIGNED" : "BRANCH", permissionCode });
        } else if (
          userRoleNorm === "operator" &&
          (permissionCode.startsWith("production.") || permissionCode.startsWith("qc.") || permissionCode.startsWith("job."))
        ) {
          hasPermission = true;
          allowedScopes.push("BRANCH");
          matchedGrants.push({ scope: "BRANCH", permissionCode });
        } else if (
          userRoleNorm === "cashier" &&
          (permissionCode.startsWith("pos.") || permissionCode.startsWith("customer.") || permissionCode.startsWith("payment."))
        ) {
          hasPermission = true;
          allowedScopes.push("BRANCH");
          matchedGrants.push({ scope: "BRANCH", permissionCode });
        }
      }

      if (!hasPermission) {
        return next(
          ErrorHelper.forbidden(`Permission denied: You do not have '${permissionCode}'.`)
        );
      }

      // Deduplicate scopes
      allowedScopes = Array.from(new Set(allowedScopes));

      // Build scope filter safely
      const branchField = typeof options === "object" ? options.branchField || "branchId" : "branchId";
      const selfField = typeof options === "object" ? options.selfField || "_id" : "_id";
      const assignedField = typeof options === "object" ? options.assignedField || "designerId" : "designerId";

      const scopeFilter = ScopeHelper.buildScopeFilter(user, matchedGrants, {
        branchField,
        selfField,
        assignedField,
      });

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
 * Managers and other roles are checked against role grants and user.permissions[resource][action].
 *
 * Example: authorizePermission("printers", "create")
 */
const authorizePermission = (resource, action = "read") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(ErrorHelper.unauthorized("Authentication required."));
      }

      const user = req.user;
      const userRoleNorm = (user.role || "").toLowerCase();
      const userRoleCodeNorm = (user.roleCode || "").toLowerCase();
      const isSuperAdmin = Boolean(
        userRoleNorm === "admin" ||
        userRoleNorm === "super_admin" ||
        userRoleNorm === "superadmin" ||
        userRoleCodeNorm === "admin" ||
        userRoleCodeNorm === "super_admin" ||
        userRoleCodeNorm === "internal_admin"
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
          authorizedBranches: userBranchIds,
          authorizedBranchIds: userBranchIds,
          scopes: ["ALL"],
          scopeFilter: {},
        };
        return next();
      }

      let hasPermission = false;
      let allowedScopes = [];

      // 1. Check legacy/direct permissions object or array on user
      if (Array.isArray(user.permissions)) {
        if (
          user.permissions.includes(`${resource}.${action}`) ||
          user.permissions.includes(resource) ||
          user.permissions.includes("*") ||
          user.permissions.includes("ALL")
        ) {
          hasPermission = true;
          allowedScopes.push("BRANCH");
        }
      } else if (user.permissions && typeof user.permissions === "object") {
        const resourcePerms = user.permissions[resource];
        if (typeof resourcePerms === "boolean") {
          if (resourcePerms) {
            hasPermission = true;
            allowedScopes.push("BRANCH");
          }
        } else if (resourcePerms && typeof resourcePerms === "object") {
          if (resourcePerms[action] === true || resourcePerms["*"] === true) {
            hasPermission = true;
            allowedScopes.push("BRANCH");
          }
        }
      }

      // 2. Check role grants
      const roleQueries = [];
      if (user.roleIds && user.roleIds.length > 0) {
        roleQueries.push({ _id: { $in: user.roleIds } });
      }
      const roleCodes = [
        user.roleCode,
        user.role,
        user.role?.toUpperCase(),
        user.roleCode?.toUpperCase(),
        userRoleNorm === "manager" ? "BRANCH_MANAGER" : null,
        userRoleNorm === "manager" ? "BRANCH_MANAGER1" : null,
        userRoleNorm === "branch_manager" ? "BRANCH_MANAGER" : null,
        userRoleNorm === "branch_manager" ? "BRANCH_MANAGER1" : null,
      ].filter(Boolean);
      if (roleCodes.length > 0) {
        roleQueries.push({ code: { $in: roleCodes } });
      }

      if (roleQueries.length > 0) {
        const roles = await Role.find({ $or: roleQueries, isActive: true }).populate("grants.permissionId");
        for (const role of roles) {
          if (role.code === "SUPER_ADMIN" || role.code === "ADMIN") {
            hasPermission = true;
            allowedScopes.push("ALL");
            break;
          }
          if (Array.isArray(role.permissions)) {
            for (const p of role.permissions) {
              if (p === `${resource}.${action}` || p === resource || p === "*" || p === "ALL") {
                hasPermission = true;
                allowedScopes.push("BRANCH");
              }
            }
          }
          if (role.grants && role.grants.length > 0) {
            for (const grant of role.grants) {
              const perm = grant.permissionId;
              const permObjCode = typeof perm === "object" && perm ? perm.code : perm;
              const gCode = (grant.permissionCode || permObjCode || "").toLowerCase();

              const targetPerm1 = `${resource}.${action}`.toLowerCase();
              const targetPerm2 = `${resource}`.toLowerCase();
              if (
                gCode === "all" ||
                gCode === "*" ||
                gCode === "can_manage_all" ||
                gCode === targetPerm1 ||
                gCode === targetPerm2 ||
                gCode.startsWith(`${resource.toLowerCase()}.`)
              ) {
                hasPermission = true;
                allowedScopes.push(grant.scope || "BRANCH");
              }
            }
          }
        }
      }

      // 3. Fallback for standard operational roles
      if (!hasPermission) {
        const r = userRoleNorm;
        if (r === "manager" || r === "branch_manager") {
          const managerResources = [
            "printers",
            "printerreadings",
            "job",
            "jobs",
            "job-orders",
            "design",
            "production",
            "pos",
            "inventory",
            "customer",
            "customers",
            "payment",
            "payments",
            "invoice",
            "invoices",
            "settlement",
            "sla"
          ];
          if (managerResources.includes(resource.toLowerCase())) {
            hasPermission = true;
            allowedScopes.push("BRANCH");
          }
        } else if (r === "designer") {
          const designerResources = ["design", "job", "jobs", "customer", "customers"];
          if (designerResources.includes(resource.toLowerCase())) {
            hasPermission = true;
            allowedScopes.push(resource.toLowerCase() === "design" ? "ASSIGNED" : "BRANCH");
          }
        } else if (r === "operator") {
          const operatorResources = ["production", "printers", "printerreadings", "job", "jobs"];
          if (operatorResources.includes(resource.toLowerCase())) {
            hasPermission = true;
            allowedScopes.push("BRANCH");
          }
        } else if (r === "cashier") {
          const cashierResources = ["pos", "customer", "customers", "payment", "payments", "job", "jobs"];
          if (cashierResources.includes(resource.toLowerCase())) {
            hasPermission = true;
            allowedScopes.push("BRANCH");
          }
        }
      }

      if (!hasPermission) {
        return next(
          ErrorHelper.forbidden(`Permission denied: You do not have '${action}' permission for '${resource}'.`)
        );
      }

      allowedScopes = Array.from(new Set(allowedScopes));

      req.authz = {
        isSuperAdmin: allowedScopes.includes("ALL"),
        userBranchIds,
        authorizedBranches: userBranchIds,
        authorizedBranchIds: userBranchIds,
        scopes: allowedScopes,
        scopeFilter: allowedScopes.includes("ALL") ? {} : { branchId: { $in: userBranchIds } },
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
};

module.exports = {
  requirePermission,
  authorizePermission,
};
