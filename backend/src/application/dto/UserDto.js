const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * User Management & RBAC Data Transfer Objects (DTOs)
 */

class CreateUserDto {
  constructor({
    username,
    email,
    password,
    employeeId,
    sendInvite = false,
  } = {}) {
    this.username = typeof username === "string" ? username.trim().toLowerCase() : "";
    this.email = typeof email === "string" ? email.trim().toLowerCase() : "";
    this.password = typeof password === "string" ? password : "";
    this.employeeId = employeeId || null;
    this.sendInvite = Boolean(sendInvite);
  }

  validate() {
    if (!this.employeeId) {
      throw ErrorHelper.badRequest("employeeId is required to create a user account");
    }
    if (!this.password || this.password.length < 6) {
      throw ErrorHelper.badRequest("Password is required and must be at least 6 characters long");
    }
    if (this.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        throw ErrorHelper.badRequest("Invalid email address format");
      }
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
    delete raw.resetPasswordToken;
    delete raw.resetPasswordExpires;

    const id = raw._id ? raw._id.toString() : (raw.id ? raw.id.toString() : "");

    return {
      _id: id,
      name: raw.name || "",
      email: raw.email || "",
      phone: raw.phone || "",
      role: raw.role || "manager",
      roleIds: raw.roleIds || [],
      roles: raw.roles || undefined,
      branch: raw.branch || "",
      branchId: raw.branchId ? (raw.branchId._id ? raw.branchId._id.toString() : raw.branchId.toString()) : null,
      branchIds: raw.branchIds || [],
      branches: raw.branches || undefined,
      employeeId: raw.employeeId ? (raw.employeeId._id ? raw.employeeId._id.toString() : raw.employeeId.toString()) : null,
      employee: raw.employee || undefined,
      location: raw.location || "",
      permissions: raw.permissions !== undefined ? raw.permissions : null,
      effectiveScopes: raw.effectiveScopes || undefined,
      status: raw.status || (raw.isActive ? "ACTIVE" : "DISABLED"),
      profilePicUrl: raw.profilePicUrl || null,
      needsReview: raw.needsReview !== undefined ? raw.needsReview : false,
      isActive: raw.isActive !== undefined ? raw.isActive : true,
      failedLoginAttempts: raw.failedLoginAttempts || 0,
      lastLoginAt: raw.lastLoginAt || null,
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
