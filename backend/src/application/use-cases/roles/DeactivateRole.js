const Role = require("../../../infrastructure/database/mongoose/models/Role");
const User = require("../../../infrastructure/database/mongoose/models/User");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const auditService = require("../../../infrastructure/audit/AuditService");

/**
 * DeactivateRole Use Case
 */
class DeactivateRole {
  constructor({ roleRepository } = {}) {
    this.roleRepository = roleRepository;
  }

  async execute(roleId, actingUser, requestContext = {}) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw ErrorHelper.notFound("Role not found");
    }

    if (role.isSystem) {
      throw ErrorHelper.forbidden("System-defined roles cannot be deactivated.");
    }

    // Check if any ACTIVE or LOCKED user currently holds this role
    const activeUsersCount = await User.countDocuments({
      $or: [
        { roleIds: role._id },
        { "permissions.roleId": role._id },
        { "permissions.roleCode": role.code },
      ],
      status: { $in: ["ACTIVE", "LOCKED"] },
      isActive: true,
    });

    if (activeUsersCount > 0) {
      throw ErrorHelper.conflict(
        `Cannot deactivate role '${role.name}' (${role.code}): It is currently assigned to ${activeUsersCount} active or locked user(s). Reassign them first.`
      );
    }

    const beforeState = role.toObject();
    role.isActive = false;
    await role.save();

    await auditService.log({
      event: "ROLE_DEACTIVATED",
      action: "role.deactivated",
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

module.exports = DeactivateRole;
