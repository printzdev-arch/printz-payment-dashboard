const Role = require("../../../infrastructure/database/mongoose/models/Role");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const auditService = require("../../../infrastructure/audit/AuditService");

/**
 * Validates that an acting user has the permissions and scopes they are trying to grant
 */
const validateGrantDelegation = async (actingUser, grantsToAssign) => {
  if (!actingUser || !grantsToAssign || grantsToAssign.length === 0) return;

  const actingRoleIds = actingUser.roleIds || [];
  const actingRoles = await Role.find({ _id: { $in: actingRoleIds }, isActive: true }).lean();

  const isSuperAdmin = actingRoles.some((r) => r.isSystem && r.code === "SUPER_ADMIN");
  if (isSuperAdmin) return; // Super admin can grant anything

  const scopeRank = { ALL: 4, BRANCH: 3, ASSIGNED: 2, SELF: 1 };

  // Map of permissions held by acting user -> highest scope
  const heldPermissions = new Map();
  for (const role of actingRoles) {
    for (const grant of role.grants || []) {
      const existingRank = heldPermissions.get(grant.permissionCode) || 0;
      const grantRank = scopeRank[grant.scope] || 0;
      if (grantRank > existingRank) {
        heldPermissions.set(grant.permissionCode, grantRank);
      }
    }
  }

  for (const requestedGrant of grantsToAssign) {
    const requiredRank = scopeRank[requestedGrant.scope] || 0;
    const userHeldRank = heldPermissions.get(requestedGrant.permissionCode) || 0;

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

class CreateRole {
  constructor({ roleRepository } = {}) {
    this.roleRepository = roleRepository;
  }

  async execute(dto, actingUser, requestContext = {}) {
    if (!dto.code || !dto.name) {
      throw ErrorHelper.badRequest("Role code and name are required.");
    }

    const code = dto.code.toUpperCase().trim();
    const existing = await Role.findOne({ code });
    if (existing) {
      throw ErrorHelper.conflict(`Role with code '${code}' already exists.`);
    }

    // Security check: cannot assign SUPER_ADMIN unless requester is SUPER_ADMIN
    if (code === "SUPER_ADMIN" || dto.isSystem) {
      const actingRoles = await Role.find({ _id: { $in: actingUser?.roleIds || [] } }).lean();
      const isSuperAdmin = actingRoles.some((r) => r.isSystem && r.code === "SUPER_ADMIN");
      if (!isSuperAdmin) {
        throw ErrorHelper.forbidden("Only SUPER_ADMIN can create system roles or SUPER_ADMIN role.");
      }
    }

    // Security check: delegation rule
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

    return role;
  }
}

module.exports = CreateRole;
