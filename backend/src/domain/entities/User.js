/**
 * User Domain Entity
 */
class User {
  constructor({
    id,
    _id,
    name,
    email,
    password,
    phone = "",
    branch = "",
    location = "",
    role = "manager",
    permissions = {},
    isActive = true,
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.name = name;
    this.email = email ? email.toLowerCase().trim() : "";
    this.password = password;
    this.phone = phone;
    this.branch = branch;
    this.location = location;
    this.role = role;
    this.permissions = permissions;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isAdmin() {
    return this.role === "admin";
  }

  isManager() {
    return this.role === "manager";
  }

  hasPermission(resource, action = "read") {
    if (this.isAdmin()) return true;
    const perms = this.permissions || {};
    const resourcePerms = perms[resource];
    if (typeof resourcePerms === "boolean") return resourcePerms;
    if (resourcePerms && typeof resourcePerms === "object") {
      return resourcePerms[action] === true;
    }
    return false;
  }

  toSafeObject() {
    return {
      _id: this._id || (this.id ? this.id.toString() : ""),
      name: this.name,
      email: this.email,
      phone: this.phone,
      branch: this.branch,
      location: this.location,
      role: this.role,
      permissions: this.permissions,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = User;
