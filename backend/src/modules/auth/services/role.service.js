const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const ApiError = require("../../../utils/errors/ApiError");
const PERMISSIONS = require("../../../utils/constants/permissions");
const { sanitizePageAccess } = require("../constants/pageCatalog");

class RoleService {
  async getRoles() {
    return Role.find().sort({ isSystem: -1, createdAt: 1 }).lean();
  }

  async getRoleById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid role ID format.");
    }
    const role = await Role.findById(id).lean();
    if (!role) {
      throw ApiError.notFound("Role not found.");
    }
    return role;
  }

  async createRole(roleData, caller = {}, requestContext = {}) {
    if (!roleData.name || !roleData.name.trim()) {
      throw ApiError.badRequest("Role name is required.");
    }
    if (!roleData.code || !roleData.code.trim()) {
      throw ApiError.badRequest("Role code is required.");
    }

    const code = roleData.code.toUpperCase().trim();
    const existing = await Role.findOne({ code });
    if (existing) {
      throw ApiError.conflict(`Role with code '${code}' already exists.`);
    }

    const role = new Role({
      name: roleData.name.trim(),
      code,
      description: roleData.description || "",
      grants: (roleData.grants || []).map((g) => ({
        permissionCode: g.permissionCode,
        scope: g.scope || "BRANCH",
      })),
      pageAccess: sanitizePageAccess(roleData.pageAccess),
      isSystem: false,
      isActive: true,
    });

    await role.save();

    return role;
  }

  async updateRole(id, roleData, caller = {}, requestContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid role ID format.");
    }

    const role = await Role.findById(id);
    if (!role) {
      throw ApiError.notFound("Role not found.");
    }

    if (role.isSystem && role.code === "SUPER_ADMIN" && roleData.isActive === false) {
      throw ApiError.forbidden("SUPER_ADMIN role cannot be deactivated.");
    }

    const before = role.toObject();

    if (roleData.name) role.name = roleData.name.trim();
    if (roleData.description !== undefined) role.description = roleData.description;
    if (roleData.pageAccess !== undefined) role.pageAccess = sanitizePageAccess(roleData.pageAccess);
    if (roleData.grants) {
      role.grants = roleData.grants.map((g) => ({
        permissionCode: g.permissionCode,
        scope: g.scope || "BRANCH",
      }));
    }
    if (roleData.isActive !== undefined && !role.isSystem) {
      role.isActive = roleData.isActive;
    }

    await role.save();

    return role;
  }

  async deactivateRole(id, caller = {}, requestContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid role ID format.");
    }

    const role = await Role.findById(id);
    if (!role) {
      throw ApiError.notFound("Role not found.");
    }

    if (role.isSystem) {
      throw ApiError.forbidden("System roles cannot be deactivated.");
    }

    const before = { isActive: role.isActive };
    role.isActive = false;
    await role.save();

    return role;
  }

  async deleteRole(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid role ID format.");
    }

    const role = await Role.findById(id);
    if (!role) {
      throw ApiError.notFound("Role not found.");
    }

    if (role.isSystem) {
      throw ApiError.forbidden("System roles cannot be deleted.");
    }

    await Role.findByIdAndDelete(id);
    return { _id: id, message: "Role deleted successfully." };
  }

  async getRolesMatrix() {
    const catalogueCodes = [];
    Object.values(PERMISSIONS).forEach((m) => Object.values(m).forEach((c) => catalogueCodes.push(c)));

    const [permissions, roles] = await Promise.all([
      Permission.find({ code: { $in: catalogueCodes } }).sort({ module: 1, code: 1 }).lean(),
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

    return {
      roles: roles.map((r) => ({
        _id: r._id,
        code: r.code,
        name: r.name,
        isSystem: r.isSystem,
        isActive: r.isActive,
      })),
      matrix: Object.values(modulesMap),
    };
  }

  async getPermissionsCatalogue() {
    return Permission.find().sort({ module: 1, code: 1 }).lean();
  }

}

module.exports = new RoleService();
