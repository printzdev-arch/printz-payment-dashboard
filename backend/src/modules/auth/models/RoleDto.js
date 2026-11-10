const { sanitizePageAccess } = require("../constants/pageCatalog");

class CreateRoleDto {
  constructor(data) {
    this.code = data.code ? data.code.toUpperCase().trim() : "";
    this.name = data.name ? data.name.trim() : "";
    this.description = data.description || "";
    this.pageAccess = sanitizePageAccess(data.pageAccess);
    const rawGrants = Array.isArray(data.grants) ? data.grants : Array.isArray(data.permissions) ? data.permissions : [];
    this.grants = rawGrants.map((g) => ({
      permissionCode: g.permissionCode || g.permissionId || (typeof g === "string" ? g : ""),
      scope: g.scope || "BRANCH",
    }));
  }

  static fromRequest(req) {
    return new CreateRoleDto(req.body || {});
  }
}

class UpdateRoleDto {
  constructor(data) {
    if (data.name !== undefined) this.name = data.name.trim();
    if (data.description !== undefined) this.description = data.description;
    if (data.pageAccess !== undefined) this.pageAccess = sanitizePageAccess(data.pageAccess);
    const rawGrants = Array.isArray(data.grants) ? data.grants : Array.isArray(data.permissions) ? data.permissions : null;
    if (rawGrants !== null) {
      this.grants = rawGrants.map((g) => ({
        permissionCode: g.permissionCode || g.permissionId || (typeof g === "string" ? g : ""),
        scope: g.scope || "BRANCH",
      }));
    }
    if (data.isActive !== undefined) this.isActive = Boolean(data.isActive);
  }

  static fromRequest(req) {
    return new UpdateRoleDto(req.body || {});
  }
}

module.exports = {
  CreateRoleDto,
  UpdateRoleDto,
};
