const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const PERMISSIONS = require("../../../utils/constants/permissions");
const { publicCatalog, sanitizePageAccess } = require("../constants/pageCatalog");
const { asyncHandler, ResponseHelper, ErrorHelper } = require("../../../utils");

/**
 * Role Controller (MVC Format)
 * Interacts directly with Role and Permission models without service/repository indirection.
 */

const validateGrantDelegation = async (actingUser, grantsToAssign) => {
  if (!actingUser || !grantsToAssign || grantsToAssign.length === 0) return;

  const roleQueries = [];
  if (Array.isArray(actingUser.roleIds) && actingUser.roleIds.length > 0) {
    roleQueries.push({ _id: { $in: actingUser.roleIds } });
  } else if (actingUser.roleId) {
    roleQueries.push({ _id: actingUser.roleId });
  }

  const roleCodes = [actingUser.roleCode, actingUser.role]
    .filter(Boolean)
    .map((c) => String(c).toUpperCase());
  if (roleCodes.length > 0) {
    roleQueries.push({ code: { $in: roleCodes } });
  }

  const actingRoles = roleQueries.length > 0
    ? await Role.find({ $or: roleQueries, isActive: true }).lean()
    : [];

  const isSuperAdmin =
    actingUser.role === "SUPER_ADMIN" ||
    actingUser.roleCode === "SUPER_ADMIN" ||
    actingRoles.some((r) => r.code === "SUPER_ADMIN");
  if (isSuperAdmin) return; // Super admin can grant anything

  const scopeRank = { ALL: 4, BRANCH: 3, ASSIGNED: 2, SELF: 1 };

  // Map of permissions held by acting user -> highest scope
  const heldPermissions = new Map();
  for (const role of actingRoles) {
    for (const grant of role.grants || []) {
      const code = grant.permissionCode || (grant.permissionId && grant.permissionId.code);
      if (!code) continue;
      const existingRank = heldPermissions.get(code) || 0;
      const normalizedScope = (grant.scope || "").toUpperCase();
      const grantRank = scopeRank[normalizedScope] || 0;
      if (grantRank > existingRank) {
        heldPermissions.set(code, grantRank);
      }
    }
  }

  // Highest rank among wildcard grants (CAN_MANAGE_ALL or ALL)
  const wildcardRank = Math.max(
    heldPermissions.get("CAN_MANAGE_ALL") || 0,
    heldPermissions.get("ALL") || 0
  );

  for (const requestedGrant of grantsToAssign) {
    const normalizedReqScope = (requestedGrant.scope || "").toUpperCase();
    const requiredRank = scopeRank[normalizedReqScope] || 0;
    const directRank = heldPermissions.get(requestedGrant.permissionCode) || 0;
    const userHeldRank = Math.max(directRank, wildcardRank);

    if (userHeldRank === 0) {
      throw ErrorHelper.forbidden(
        `Privilege delegation violation: You cannot grant '${requestedGrant.permissionCode}' because you do not hold this permission.`
      );
    }

    if (requiredRank > userHeldRank) {
      throw ErrorHelper.forbidden(
        `Privilege delegation violation: You cannot grant '${requestedGrant.scope}' scope for '${requestedGrant.permissionCode}' as you only hold a narrower scope.`
      );
    }
  }
};

const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find({}).sort({ isSystem: -1, code: 1 }).lean();
  return ResponseHelper.success(res, roles, "Roles retrieved successfully.");
});

// Menu items that can be ticked in Role Management, grouped for display
const getPageCatalog = asyncHandler(async (req, res) => {
  const groups = publicCatalog();
  return ResponseHelper.success(res, groups, "Page catalogue retrieved successfully.");
});

const getRolesMatrix = asyncHandler(async (req, res) => {
  const catalogueCodes = [];
  Object.values(PERMISSIONS).forEach((m) =>
    Object.values(m).forEach((c) => catalogueCodes.push(c))
  );

  const [permissions, roles] = await Promise.all([
    Permission.find({ code: { $in: catalogueCodes } })
      .sort({ module: 1, code: 1 })
      .lean(),
    Role.find().sort({ isSystem: -1, code: 1 }).lean(),
  ]);

  const modulesMap = {};

  for (const perm of permissions) {
    const moduleKey = perm.module || "Common";
    if (!modulesMap[moduleKey]) {
      modulesMap[moduleKey] = {
        module: moduleKey,
        permissions: [],
      };
    }

    const roleGrants = {};
    for (const role of roles) {
      const grant = (role.grants || []).find((g) => g.permissionCode === perm.code);
      if (role.isSystem && role.code === "SUPER_ADMIN") {
        roleGrants[role.code] = {
          granted: true,
          scope: "ALL",
          operationCodes: [],
          isSystem: true,
        };
      } else if (grant) {
        roleGrants[role.code] = {
          granted: true,
          scope: grant.scope || "BRANCH",
          operationCodes: grant.operationCodes || [],
          isSystem: role.isSystem || false,
        };
      } else {
        roleGrants[role.code] = {
          granted: false,
          scope: null,
          operationCodes: [],
          isSystem: role.isSystem || false,
        };
      }
    }

    modulesMap[moduleKey].permissions.push({
      code: perm.code,
      description: perm.description,
      grants: roleGrants,
    });
  }

  const result = {
    roles: roles.map((r) => ({
      _id: r._id,
      code: r.code,
      name: r.name,
      isSystem: r.isSystem,
      isActive: r.isActive,
    })),
    matrix: Object.values(modulesMap),
  };

  return ResponseHelper.success(res, result, "Roles permission matrix retrieved.");
});

const getPermissionsCatalogue = asyncHandler(async (req, res) => {
  const permissions = (await Permission.find({}).sort({ module: 1, code: 1 }).lean()) || [];

  const grouped = permissions.reduce((acc, curr) => {
    const mod = curr.module || "general";
    acc[mod] = acc[mod] || [];
    acc[mod].push(curr);
    return acc;
  }, {});

  return ResponseHelper.success(
    res,
    { permissions, grouped },
    "Permissions catalogue retrieved."
  );
});

const getRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw ErrorHelper.notFound("Role not found.");
  }
  const role = await Role.findById(id).lean();
  if (!role) {
    throw ErrorHelper.notFound("Role not found.");
  }
  return ResponseHelper.success(res, role, "Role retrieved successfully.");
});

const createRole = asyncHandler(async (req, res) => {
  const dto = req.body || {};
  const actingUser = req.user;
  const requestContext = {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
  };

  if (!dto.code || !dto.name) {
    throw ErrorHelper.badRequest("Role code and name are required.");
  }

  const code = dto.code.toUpperCase().trim();
  const existing = await Role.findOne({ code });
  if (existing) {
    throw ErrorHelper.conflict(`Role with code '${code}' already exists.`);
  }

  if (code === "SUPER_ADMIN" || dto.isSystem) {
    const actingRoles = await Role.find({ _id: { $in: actingUser?.roleIds || [] } }).lean();
    const isSuperAdmin = actingRoles.some((r) => r.isSystem && r.code === "SUPER_ADMIN");
    if (!isSuperAdmin) {
      throw ErrorHelper.forbidden("Only SUPER_ADMIN can create system roles or SUPER_ADMIN role.");
    }
  }

  if (dto.grants && Array.isArray(dto.grants)) {
    await validateGrantDelegation(actingUser, dto.grants);
  }

  // "Can sign in" is explicit: a role that cannot sign in has no pages; one that can needs at least one
  const loginAllowed = dto.loginAllowed === undefined ? undefined : Boolean(dto.loginAllowed);
  let pageAccess = sanitizePageAccess(dto.pageAccess);
  if (loginAllowed === false) pageAccess = [];
  if (loginAllowed === true && pageAccess.length === 0) {
    throw ErrorHelper.badRequest("Tick at least one page for a role that can sign in.");
  }

  const role = new Role({
    code,
    name: dto.name.trim(),
    description: dto.description || "",
    grants: dto.grants || [],
    pageAccess,
    ...(loginAllowed === undefined ? {} : { loginAllowed }),
    isSystem: Boolean(dto.isSystem),
    isActive: true,
  });

  await role.save();

  return ResponseHelper.created(res, role, "Role created successfully.");
});

const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dto = req.body || {};
  const actingUser = req.user;
  const requestContext = {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
  };

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw ErrorHelper.notFound("Role not found.");
  }

  const role = await Role.findById(id);
  if (!role) {
    throw ErrorHelper.notFound("Role not found.");
  }

  if (role.isSystem && dto.code && dto.code !== role.code) {
    throw ErrorHelper.forbidden("Built-in system role codes cannot be modified.");
  }

  if (dto.grants && Array.isArray(dto.grants)) {
    await validateGrantDelegation(actingUser, dto.grants);
    role.grants = dto.grants;
  }

  // The Admin roles always sign in; for every other role the setting is explicit
  if (dto.loginAllowed !== undefined && !(["SUPER_ADMIN", "ADMIN"].includes(role.code))) {
    const allowed = Boolean(dto.loginAllowed);
    const nextPages = allowed
      ? sanitizePageAccess(dto.pageAccess !== undefined ? dto.pageAccess : role.pageAccess)
      : [];
    if (allowed && nextPages.length === 0) {
      throw ErrorHelper.badRequest("Tick at least one page for a role that can sign in.");
    }
    role.loginAllowed = allowed;
    role.pageAccess = nextPages;
    dto.pageAccess = undefined; // already applied above
  }

  if (dto.pageAccess !== undefined) {
    // Super Admin always has every page. Admin may be limited but always keeps Employees so Role Management stays reachable
    if (role.code === "SUPER_ADMIN") {
      throw ErrorHelper.forbidden("Super Admin always has every page and cannot be limited.");
    }
    const pages = sanitizePageAccess(dto.pageAccess);
    if (role.code === "ADMIN" && !pages.includes("employees")) pages.push("employees");
    role.pageAccess = pages;
  }
  if (dto.name !== undefined) role.name = dto.name.trim();
  if (dto.description !== undefined) role.description = dto.description;
  if (dto.isActive !== undefined) role.isActive = Boolean(dto.isActive);

  await role.save();

  return ResponseHelper.success(res, role, "Role updated successfully.");
});

const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw ErrorHelper.notFound("Role not found.");
  }

  const role = await Role.findById(id);
  if (!role) {
    throw ErrorHelper.notFound("Role not found.");
  }

  if (role.isSystem) {
    throw ErrorHelper.forbidden("Built-in system roles cannot be deleted.");
  }
  if (["SUPER_ADMIN", "ADMIN"].includes(role.code)) {
    throw ErrorHelper.forbidden("The Admin roles cannot be deleted.");
  }

  // An employee without a role could not sign in, so a role in use must be reassigned first
  const Employee = require("../../employees/models/Employee");
  const inUse = await Employee.countDocuments({ roleId: role._id });
  if (inUse > 0) {
    throw ErrorHelper.conflict(`${inUse} employee${inUse === 1 ? " is" : "s are"} still using this role. Change their role first.`);
  }

  await Role.findByIdAndDelete(id);
  return ResponseHelper.success(res, null, "Role deleted successfully.");
});

const deactivateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw ErrorHelper.notFound("Role not found.");
  }

  const role = await Role.findById(id);
  if (!role) {
    throw ErrorHelper.notFound("Role not found.");
  }

  if (role.isSystem) {
    throw ErrorHelper.forbidden("Built-in system roles cannot be deactivated.");
  }

  role.isActive = false;
  await role.save();

  return ResponseHelper.success(res, role, "Role deactivated successfully.");
});

module.exports = {
  getRoles,
  getRolesMatrix,
  getPageCatalog,
  getPermissionsCatalogue,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  deactivateRole,
  validateGrantDelegation,
};
