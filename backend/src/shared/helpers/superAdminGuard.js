const User = require("../../infrastructure/database/mongoose/models/User");
const Role = require("../../infrastructure/database/mongoose/models/Role");
const ErrorHelper = require("../errors/ErrorHelper");

/**
 * Ensures that the last active SUPER_ADMIN cannot be disabled, deactivated, or demoted.
 * @param {string|Object} targetUserId
 * @returns {Promise<boolean>}
 */
const ensureNotLastSuperAdmin = async (targetUserId) => {
  if (!targetUserId) return true;

  const superAdminRole = await Role.findOne({ code: "SUPER_ADMIN", isSystem: true }).lean();
  if (!superAdminRole) return true;

  const targetUser = await User.findOne({ _id: targetUserId }).lean();
  if (!targetUser) return true;

  const userRoleIds = (targetUser.roleIds || []).map((id) => id.toString());
  const isTargetSuperAdmin = userRoleIds.includes(superAdminRole._id.toString());

  if (!isTargetSuperAdmin) {
    return true;
  }

  // Count active super admins excluding target user
  const otherActiveSuperAdmins = await User.countDocuments({
    _id: { $ne: targetUser._id },
    roleIds: superAdminRole._id,
    status: "ACTIVE",
    isActive: true,
  });

  if (otherActiveSuperAdmins === 0) {
    throw ErrorHelper.conflict(
      "Safety rule violation: Cannot disable, deactivate, or remove roles from the last active SUPER_ADMIN."
    );
  }

  return true;
};

module.exports = {
  ensureNotLastSuperAdmin,
};
