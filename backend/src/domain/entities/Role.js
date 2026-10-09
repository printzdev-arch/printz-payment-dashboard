class Role {
  constructor({
    id,
    _id,
    code,
    name,
    description = "",
    grants = [],
    isSystem = false,
    isActive = true,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = this.id;
    this.code = code;
    this.name = name;
    this.description = description;
    this.grants = grants; // Array of { permissionCode, scope: 'ALL'|'BRANCH'|'ASSIGNED'|'SELF' }
    this.isSystem = isSystem;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Role;
