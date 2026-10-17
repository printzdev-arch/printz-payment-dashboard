const Role = require("../models/Role");
const Permission = require("../models/Permission");
const ApiError = require("../utils/ApiError");

const SCOPE_HIERARCHY = {
  ALL: 3,
  BRANCH: 2,
  ASSIGNED: 1,
  SELF: 1,
};

const ErrorHelper = require("../utils/errors/ErrorHelper");

const scopeRank = { ALL: 4, BRANCH: 3, ASSIGNED: 2, SELF: 1 };

const validateGrantDelegation = async (arg1, arg2) => {
  let actingUser, grantsToAssign;
  if (Array.isArray(arg1)) {
    grantsToAssign = arg1;
    actingUser = arg2;
  } else {
    actingUser = arg1;
    grantsToAssign = arg2;
  }
  if (!actingUser || !grantsToAssign || grantsToAssign.length === 0) return true;

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
  if (isSuperAdmin) return true; // Super admin can grant anything

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
  return true;
};

class RoleService {
  async createRole(data, actingUser = {}) {
    if (!data.name || !data.code) {
      throw ApiError.badRequest("Role name and code are required");
    }

    const code = String(data.code).trim().toUpperCase();
    const existing = await Role.findOne({ code });
    if (existing) {
      throw ApiError.conflict(`Role with code '${code}' already exists`);
    }

    if (Array.isArray(data.grants) && data.grants.length > 0) {
      await validateGrantDelegation(data.grants, actingUser);
    }

    const role = await Role.create({
      ...data,
      code,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return role;
  }

  async getRoles(query = {}, { page = 1, limit = 50 } = {}) {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true" || query.isActive === true;
    if (query.search) {
      const regex = new RegExp(query.search.trim(), "i");
      filter.$or = [{ name: regex }, { code: regex }];
    }

    const [records, total] = await Promise.all([
      Role.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
      Role.countDocuments(filter),
    ]);

    return {
      records,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }

  async getRoleById(id) {
    const role = await Role.findById(id).lean();
    if (!role) throw ApiError.notFound("Role not found");
    return role;
  }

  async updateRole(id, data, actingUser = {}) {
    const role = await Role.findById(id);
    if (!role) throw ApiError.notFound("Role not found");

    if (Array.isArray(data.grants)) {
      await validateGrantDelegation(data.grants, actingUser);
    }

    Object.assign(role, data);
    await role.save();
    return role;
  }

  async deleteRole(id) {
    const role = await Role.findById(id);
    if (!role) throw ApiError.notFound("Role not found");
    if (role.isSystem) throw ApiError.forbidden("Cannot delete system protected role");

    await Role.findByIdAndDelete(id);
    return { success: true, message: "Role deleted successfully" };
  }

  async getPermissionsMatrix() {
    return Permission.find({}).sort({ category: 1, name: 1 }).lean();
  }
}

module.exports = new RoleService();
module.exports.validateGrantDelegation = validateGrantDelegation;
