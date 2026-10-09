const Permission = require("../../../infrastructure/database/mongoose/models/Permission");
const Role = require("../../../infrastructure/database/mongoose/models/Role");

/**
 * GetRolesMatrix Use Case
 * Generates a frontend-friendly matrix: modules -> permissions -> per-role grants & scopes.
 */
class GetRolesMatrix {
  constructor({ roleRepository, permissionRepository } = {}) {
    this.roleRepository = roleRepository;
    this.permissionRepository = permissionRepository;
  }

  async execute() {
    const PERMISSIONS = require("../../../shared/constants/permissions");
    const catalogueCodes = [];
    Object.values(PERMISSIONS).forEach((m) => Object.values(m).forEach((c) => catalogueCodes.push(c)));

    const [permissions, roles] = await Promise.all([
      Permission.find({ code: { $in: catalogueCodes } }).sort({ module: 1, code: 1 }).lean(),
      Role.find().sort({ isSystem: -1, code: 1 }).lean(),
    ]);

    // Group permissions by module
    const modulesMap = {};

    for (const perm of permissions) {
      const moduleKey = perm.module || "Common";
      if (!modulesMap[moduleKey]) {
        modulesMap[moduleKey] = {
          module: moduleKey,
          permissions: [],
        };
      }

      // Build role grants map for this specific permission
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
}

module.exports = GetRolesMatrix;
