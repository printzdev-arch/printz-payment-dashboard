class Permission {
  constructor({ id, code, module, description, createdAt = new Date() }) {
    this.id = id || code;
    this.code = code;
    this.module = module;
    this.description = description;
    this.createdAt = createdAt;
  }
}

module.exports = Permission;
