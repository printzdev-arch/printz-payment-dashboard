const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const auditService = require("../utils/AuditService");
const PERMISSIONS = require("../utils/constants/permissions");
const { asyncHandler, ResponseHelper, ErrorHelper } = require("../utils");

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

  const role = new Role({
    code,
    name: dto.name.trim(),
    description: dto.description || "",
    grants: dto.grants || [],
    isSystem: Boolean(dto.isSystem),
    isActive: true,
  });

  await role.save();

  await auditService.log({
    event: "ROLE_CREATED",
    action: "role.created",
    userId: actingUser?._id,
    userEmail: actingUser?.email,
    resourceType: "Role",
    resourceId: role._id,
    afterState: role.toObject(),
    ipAddress: requestContext.ip,
    userAgent: requestContext.userAgent,
    status: "SUCCESS",
  });

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

  if (dto.name !== undefined) role.name = dto.name.trim();
  if (dto.description !== undefined) role.description = dto.description;
  if (dto.isActive !== undefined) role.isActive = Boolean(dto.isActive);

  await role.save();

  await auditService.log({
    event: "ROLE_UPDATED",
    action: "role.updated",
    userId: actingUser?._id,
    userEmail: actingUser?.email,
    resourceType: "Role",
    resourceId: role._id,
    afterState: role.toObject(),
    ipAddress: requestContext.ip,
    userAgent: requestContext.userAgent,
    status: "SUCCESS",
  });

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
  getPermissionsCatalogue,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  deactivateRole,
  validateGrantDelegation,
};
