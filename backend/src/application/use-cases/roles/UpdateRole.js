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

class UpdateRole {
  constructor({ roleRepository } = {}) {
    this.roleRepository = roleRepository;
  }

  async execute(id, dto, actingUser, requestContext = {}) {
    const role = await Role.findById(id);
    if (!role) {
      throw ErrorHelper.notFound("Role not found");
    }

    // System roles are editable ONLY by SUPER_ADMIN
    if (role.isSystem) {
      const actingRoles = await Role.find({ _id: { $in: actingUser?.roleIds || [] } }).lean();
      const isSuperAdmin = actingRoles.some((r) => r.isSystem && r.code === "SUPER_ADMIN");
      if (!isSuperAdmin) {
        throw ErrorHelper.forbidden("System-defined roles can only be edited by SUPER_ADMIN.");
      }

      // System role code cannot be changed
      if (dto.code && dto.code.toUpperCase().trim() !== role.code) {
        throw ErrorHelper.badRequest("System role codes cannot be modified.");
      }
    }

    // If changing non-system role code, ensure uniqueness
    if (dto.code && dto.code.toUpperCase().trim() !== role.code) {
      const newCode = dto.code.toUpperCase().trim();
      const existing = await Role.findOne({ code: newCode });
      if (existing) {
        throw ErrorHelper.conflict(`Role with code '${newCode}' already exists.`);
      }
      role.code = newCode;
    }

    // Delegation check on grants update
    if (dto.grants && Array.isArray(dto.grants)) {
      await validateGrantDelegation(actingUser, dto.grants);
      role.grants = dto.grants;
    }

    const beforeState = role.toObject();

    if (dto.name) role.name = dto.name.trim();
    if (dto.description !== undefined) role.description = dto.description;

    await role.save();

    await auditService.log({
      event: "ROLE_UPDATED",
      action: "role.updated",
      userId: actingUser?._id,
      userEmail: actingUser?.email,
      resourceType: "Role",
      resourceId: role._id,
      beforeState,
      afterState: role.toObject(),
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
    });

    return role;
  }
}

module.exports = UpdateRole;
