const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const Role = require("../../../infrastructure/database/mongoose/models/Role");
const Branch = require("../../../infrastructure/database/mongoose/models/Branch");
const Employee = require("../../../infrastructure/database/mongoose/models/Employee");

class GetCurrentUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw ErrorHelper.notFound("User not found");
    }

    const rawUser = typeof user.toObject === "function" ? user.toObject() : { ...user };
    delete rawUser.password;
    delete rawUser.resetPasswordToken;
    delete rawUser.resetPasswordExpires;

    // 1. Resolve roles & compile permissions + scopes
    let roles = [];
    if (rawUser.roleIds && rawUser.roleIds.length > 0) {
      const validRoleIds = rawUser.roleIds
        .map((r) => (r && r._id ? r._id : r))
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      roles = await Role.find({ _id: { $in: validRoleIds }, isActive: true }).lean();
    } else if (rawUser.role) {
      // Find default role by code/name
      const matchedRole = await Role.findOne({
        code: new RegExp(`^${rawUser.role}$`, "i"),
        isActive: true,
      }).lean();
      if (matchedRole) roles.push(matchedRole);
    }

    // 2. Resolve branches
    let branches = [];
    const branchIdList = [
      ...(Array.isArray(rawUser.branchIds) ? rawUser.branchIds : []),
      rawUser.branchId,
    ].filter(Boolean);

    if (branchIdList.length > 0) {
      const validBranchIds = branchIdList
        .map((b) => (b && b._id ? b._id : b))
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      branches = await Branch.find({ _id: { $in: validBranchIds } }).lean();
    }

    // 3. Resolve linked employee
    let employee = null;
    if (rawUser.employeeId && mongoose.Types.ObjectId.isValid(rawUser.employeeId)) {
      employee = await Employee.findById(rawUser.employeeId)
        .select("-bankDetails.accountNumberEncrypted")
        .lean();
    }

    // 4. Compile effective permissions and scopes
    const permissionsMap = typeof rawUser.permissions === "object" && rawUser.permissions ? { ...rawUser.permissions } : {};
    const effectiveScopes = new Set();

    if (rawUser.role === "admin" || rawUser.role === "SUPER_ADMIN") {
      effectiveScopes.add("ALL");
    }

    roles.forEach((r) => {
      if (r.grants && Array.isArray(r.grants)) {
        r.grants.forEach((g) => {
          if (g.permissionCode) {
            permissionsMap[g.permissionCode] = true;
          }
          if (g.scope) {
            effectiveScopes.add(g.scope);
          }
        });
      }
    });

    if (effectiveScopes.size === 0) {
      effectiveScopes.add(rawUser.role === "admin" ? "ALL" : "BRANCH");
    }

    return {
      ...rawUser,
      roles,
      branches,
      employee,
      effectiveScopes: Array.from(effectiveScopes),
      permissions: permissionsMap,
    };
  }
}

module.exports = GetCurrentUser;

