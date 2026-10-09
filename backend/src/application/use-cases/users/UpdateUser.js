const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const Role = require("../../../infrastructure/database/mongoose/models/Role");
const Branch = require("../../../infrastructure/database/mongoose/models/Branch");
const Employee = require("../../../infrastructure/database/mongoose/models/Employee");
const User = require("../../../infrastructure/database/mongoose/models/User");
const auditService = require("../../../infrastructure/audit/AuditService");

class UpdateUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  _buildIdQuery(id) {
    if (!id) return { _id: id };
    const str = String(id).trim();
    if (mongoose.Types.ObjectId.isValid(str) && str.length === 24) {
      return {
        $or: [
          { _id: new mongoose.Types.ObjectId(str) },
          { _id: str },
        ],
      };
    }
    return { _id: str };
  }

  async execute(targetUserId, updateData, caller = {}, requestContext = {}) {
    if (!targetUserId) {
      throw ErrorHelper.badRequest("User ID is required");
    }

    const existingUser = await User.findOne(this._buildIdQuery(targetUserId));
    if (!existingUser) {
      throw ErrorHelper.notFound("User not found");
    }

    const callerId = (caller._id || caller.id || caller.userId || "").toString();
    const isSelf = callerId === existingUser._id.toString();
    const isSuperAdmin = Boolean(
      caller.role === "admin" ||
      caller.role === "SUPER_ADMIN" ||
      caller.roleCode === "SUPER_ADMIN" ||
      caller.roleCode === "ADMIN" ||
      caller.isSuperAdmin
    );

    const callerBranchIds = (caller.userBranchIds || [])
      .map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
      .filter(Boolean);

    // ── 1. Security & Privilege Escalation Checks ─────────────────────────────
    let allowedUpdates = {};

    if (isSelf && !isSuperAdmin) {
      // Normal self-profile update: ONLY safe profile fields are permitted
      const privilegedFieldsAttempted = [
        "role",
        "roleIds",
        "permissions",
        "branch",
        "branchId",
        "branchIds",
        "status",
        "isActive",
        "employeeId",
        "password",
        "email",
      ].filter((f) => updateData[f] !== undefined);

      if (privilegedFieldsAttempted.length > 0) {
        throw ErrorHelper.forbidden(
          `Privilege escalation detected: You cannot modify security/administrative fields (${privilegedFieldsAttempted.join(
            ", "
          )}) on your profile.`
        );
      }

      if (updateData.name !== undefined) allowedUpdates.name = updateData.name;
      if (updateData.phone !== undefined) allowedUpdates.phone = updateData.phone;
      if (updateData.profilePicUrl !== undefined) allowedUpdates.profilePicUrl = updateData.profilePicUrl;
    } else {
      // Management update on a user
      // Check branch scoping for non-super-admins
      if (!isSuperAdmin) {
        const userBranchStr = existingUser.branchId ? existingUser.branchId.toString() : null;
        if (!userBranchStr || !callerBranchIds.includes(userBranchStr)) {
          throw ErrorHelper.forbidden("Access denied: Target user is outside your authorized branch scope.");
        }
      }

      allowedUpdates = { ...updateData };

      // Prevent assigning admin / SUPER_ADMIN role if caller is not super admin
      if (!isSuperAdmin && (allowedUpdates.role === "admin" || allowedUpdates.role === "SUPER_ADMIN")) {
        throw ErrorHelper.forbidden("You do not have permission to assign Administrative roles.");
      }

      // ── 2. Validate Role & RoleIds ──────────────────────────────────────────
      if (allowedUpdates.roleIds && Array.isArray(allowedUpdates.roleIds) && allowedUpdates.roleIds.length > 0) {
        const roleIdStrs = allowedUpdates.roleIds
          .map((r) => (r && r._id ? r._id.toString() : (r ? r.toString() : "")))
          .filter((id) => mongoose.Types.ObjectId.isValid(id));

        if (roleIdStrs.length !== allowedUpdates.roleIds.length) {
          throw ErrorHelper.badRequest("One or more roleIds are invalid ObjectIds.");
        }

        const activeRoles = await Role.find({ _id: { $in: roleIdStrs }, isActive: true });
        if (activeRoles.length !== roleIdStrs.length) {
          throw ErrorHelper.badRequest("One or more specified roles do not exist or are inactive.");
        }

        if (!isSuperAdmin) {
          const hasAdminRole = activeRoles.some(
            (r) => r.code === "SUPER_ADMIN" || r.code === "ADMIN" || r.code === "INTERNAL_ADMIN"
          );
          if (hasAdminRole) {
            throw ErrorHelper.forbidden("You do not have permission to assign Administrative roles.");
          }
        }
        allowedUpdates.roleIds = roleIdStrs;
      }

      // ── 3. Validate Branch & BranchIds ──────────────────────────────────────
      const allBranchIdsToValidate = [
        ...(Array.isArray(allowedUpdates.branchIds) ? allowedUpdates.branchIds : []),
        allowedUpdates.branchId,
      ].filter(Boolean);

      if (allBranchIdsToValidate.length > 0) {
        const bStrs = allBranchIdsToValidate
          .map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
          .filter((id) => mongoose.Types.ObjectId.isValid(id));

        if (bStrs.length > 0) {
          const foundBranches = await Branch.find({ _id: { $in: bStrs } });
          if (foundBranches.length !== Array.from(new Set(bStrs)).length) {
            throw ErrorHelper.badRequest("One or more specified branches do not exist.");
          }
        }

        if (!isSuperAdmin && callerBranchIds.length > 0) {
          const hasUnauthorizedBranch = bStrs.some((b) => !callerBranchIds.includes(b));
          if (hasUnauthorizedBranch) {
            throw ErrorHelper.forbidden("Cannot assign branches outside your authorized branch scope.");
          }
        }
      }

      // ── 4. Validate Employee & 1:1 Relationship ─────────────────────────────
      if (allowedUpdates.employeeId) {
        const empId = allowedUpdates.employeeId._id ? allowedUpdates.employeeId._id : allowedUpdates.employeeId;
        if (!mongoose.Types.ObjectId.isValid(empId)) {
          throw ErrorHelper.badRequest("Invalid employeeId format.");
        }

        const employee = await Employee.findById(empId);
        if (!employee) {
          throw ErrorHelper.badRequest("Specified employee does not exist.");
        }
        if (employee.employmentStatus !== "ACTIVE" || !employee.isActive) {
          throw ErrorHelper.badRequest("Cannot link user to an inactive or departed employee.");
        }

        const existingLinkedUser = await User.findOne({
          employeeId: empId,
          _id: { $ne: existingUser._id },
          status: { $ne: "DISABLED" },
          isActive: true,
        });

        if (existingLinkedUser) {
          throw ErrorHelper.conflict("Employee is already linked to another active user account (1:1 constraint).");
        }
      }
    }

    // ── 5. Perform Update ───────────────────────────────────────────────────
    const beforeState = {
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      roleIds: existingUser.roleIds,
      branchId: existingUser.branchId,
      branchIds: existingUser.branchIds,
      status: existingUser.status,
      employeeId: existingUser.employeeId,
    };

    const updatedUser = await this.userRepository.update(targetUserId, allowedUpdates);
    if (!updatedUser) {
      throw ErrorHelper.notFound("User not found");
    }

    // ── 6. Audit Logging ────────────────────────────────────────────────────
    await auditService.log({
      event: "USER_UPDATED",
      action: "USER_UPDATE",
      userId: caller._id || caller.id || caller.userId,
      userEmail: caller.email,
      resourceType: "User",
      resourceId: updatedUser._id,
      branchId: updatedUser.branchId,
      before: beforeState,
      after: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        roleIds: updatedUser.roleIds,
        branchId: updatedUser.branchId,
        branchIds: updatedUser.branchIds,
        status: updatedUser.status,
        employeeId: updatedUser.employeeId,
      },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
    });

    return updatedUser;
  }
}

module.exports = UpdateUser;

