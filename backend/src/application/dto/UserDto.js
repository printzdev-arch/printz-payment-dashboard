const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * User Management & RBAC Data Transfer Objects (DTOs)
 */

class CreateUserDto {
  constructor({
    name,
    email,
    password,
    role = "manager",
    branch = "",
    branchId = null,
    location = "",
    phone = "",
    permissions = null,
    profilePicUrl = null,
    needsReview = false,
    isActive = true,
  } = {}) {
    this.name = typeof name === "string" ? name.trim() : "";
    this.email = typeof email === "string" ? email.trim().toLowerCase() : "";
    this.password = typeof password === "string" ? password : "";
    this.role = role || "manager";
    this.branch = typeof branch === "string" ? branch.trim() : "";
    this.branchId = branchId || null;
    this.location = typeof location === "string" ? location.trim() : "";
    this.phone = typeof phone === "string" ? phone.trim() : "";
    this.permissions = permissions || null;
    this.profilePicUrl = profilePicUrl || null;
    this.needsReview = typeof needsReview === "boolean" ? needsReview : false;
    this.isActive = typeof isActive === "boolean" ? isActive : true;
  }

  validate() {
    if (!this.name) {
      throw ErrorHelper.badRequest("Name is required");
    }
    if (!this.email) {
      throw ErrorHelper.badRequest("Email is required");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw ErrorHelper.badRequest("Invalid email address format");
    }
    if (!this.password || this.password.length < 6) {
      throw ErrorHelper.badRequest("Password must be at least 6 characters long");
    }
    if (this.role && !["admin", "manager"].includes(this.role)) {
      throw ErrorHelper.badRequest("Role must be either 'admin' or 'manager'");
    }
    return true;
  }

  static fromRequest(req) {
    return new CreateUserDto(req.body || {});
  }
}

class UpdateUserDto {
  constructor({
    name,
    email,
    password,
    role,
    branch,
    branchId,
    location,
    phone,
    permissions,
    profilePicUrl,
    needsReview,
    isActive,
  } = {}) {
    if (name !== undefined) this.name = typeof name === "string" ? name.trim() : "";
    if (email !== undefined) this.email = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (password !== undefined && password !== "") this.password = password;
    if (role !== undefined) this.role = role;
    if (branch !== undefined) this.branch = typeof branch === "string" ? branch.trim() : "";
    if (branchId !== undefined) this.branchId = branchId;
    if (location !== undefined) this.location = typeof location === "string" ? location.trim() : "";
    if (phone !== undefined) this.phone = typeof phone === "string" ? phone.trim() : "";
    if (permissions !== undefined) this.permissions = permissions;
    if (profilePicUrl !== undefined) this.profilePicUrl = profilePicUrl;
    if (needsReview !== undefined) this.needsReview = Boolean(needsReview);
    if (isActive !== undefined) this.isActive = Boolean(isActive);
  }

  validate() {
    if (this.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        throw ErrorHelper.badRequest("Invalid email address format");
      }
    }
    if (this.password !== undefined && this.password.length < 6) {
      throw ErrorHelper.badRequest("Password must be at least 6 characters long");
    }
    if (this.role !== undefined && !["admin", "manager"].includes(this.role)) {
      throw ErrorHelper.badRequest("Role must be either 'admin' or 'manager'");
    }
    return true;
  }

  static fromRequest(req) {
    return new UpdateUserDto(req.body || {});
  }
}

class UpdateUserPermissionsDto {
  constructor({ permissions } = {}) {
    this.permissions = typeof permissions === "object" ? permissions : {};
  }

  validate() {
    if (!this.permissions || typeof this.permissions !== "object") {
      throw ErrorHelper.badRequest("Permissions object is required");
    }
    return true;
  }

  static fromRequest(req) {
    return new UpdateUserPermissionsDto(req.body || {});
  }
}

class UpdateUserRoleDto {
  constructor({ role } = {}) {
    this.role = role;
  }

  validate() {
    if (!this.role || !["admin", "manager"].includes(this.role)) {
      throw ErrorHelper.badRequest("Role must be either 'admin' or 'manager'");
    }
    return true;
  }

  static fromRequest(req) {
    return new UpdateUserRoleDto(req.body || {});
  }
}

class UserResponseDto {
  static fromEntity(user) {
    if (!user) return null;
    const raw = typeof user.toObject === "function" ? user.toObject() : { ...user };

    delete raw.password;

    const id = raw._id ? raw._id.toString() : (raw.id ? raw.id.toString() : "");

    return {
      _id: id,
      id: id,
      uid: id,
      name: raw.name || "",
      email: raw.email || "",
      phone: raw.phone || "",
      role: raw.role || "manager",
      branch: raw.branch || "",
      branchId: raw.branchId ? raw.branchId.toString() : null,
      location: raw.location || "",
      permissions: raw.permissions !== undefined ? raw.permissions : null,
      profilePicUrl: raw.profilePicUrl || null,
      needsReview: raw.needsReview !== undefined ? raw.needsReview : false,
      isActive: raw.isActive !== undefined ? raw.isActive : true,
      createdAt: raw.createdAt || null,
      updatedAt: raw.updatedAt || null,
    };
  }

  static fromEntities(users) {
    if (!Array.isArray(users)) return [];
    return users.map((u) => UserResponseDto.fromEntity(u));
  }
}

module.exports = {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
  UpdateUserRoleDto,
  UserResponseDto,
};
