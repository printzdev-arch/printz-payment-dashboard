const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../../models/auth/User");
const Role = require("../../models/auth/Role");
const Branch = require("../../models/common/Branch");
const Employee = require("../../models/auth/Employee");
const AuditLog = require("../../models/common/AuditLog");
const ApiError = require("../../utils/ApiError");

class UserService {
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

  async _resolveBranch(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    if (mongoose.Types.ObjectId.isValid(trimmed) && trimmed.length === 24) {
      const branch = await Branch.findById(trimmed).lean();
      if (branch) return branch;
    }
    return Branch.findOne({
      $or: [
        { name: new RegExp(`^${trimmed}$`, "i") },
        { code: new RegExp(`^${trimmed}$`, "i") },
      ],
    }).lean();
  }

  async _enrichUser(user) {
    if (!user) return null;
    const userObj = user._doc
      ? { ...user._doc }
      : (typeof user.toObject === "function" ? user.toObject({ transform: false }) : { ...user });

    // Single source of truth: If user is linked to an Employee, derive role and branch dynamically
    if (userObj.employeeId) {
      const employee = await Employee.findById(userObj.employeeId)
        .populate("roleId", "code name grants")
        .populate("branchId", "name code location")
        .lean();

      if (employee) {
        userObj.employee = employee;

        if (employee.branchId) {
          let branchDoc = employee.branchId;
          const bId = branchDoc._id || branchDoc;
          userObj.branchId = bId;
          userObj.branchIds = [bId];

          if (!branchDoc.name && mongoose.Types.ObjectId.isValid(bId)) {
            branchDoc = (await Branch.findById(bId).lean()) || {};
          }

          if (branchDoc.name) {
            userObj.branch = branchDoc.name;
          }
        }

        if (employee.roleId) {
          let roleDoc = employee.roleId;
          const rId = roleDoc._id || roleDoc;
          userObj.roleId = rId;
          userObj.roleIds = [rId];

          if (!roleDoc.code && mongoose.Types.ObjectId.isValid(rId)) {
            roleDoc = (await Role.findById(rId).lean()) || {};
          }

          if (roleDoc.code) {
            userObj.roleCode = roleDoc.code;
            userObj.role = roleDoc.code.toLowerCase();
          }
        }

        if (employee.name) {
          userObj.name = employee.name;
        }
        if (employee.mobile) {
          userObj.phone = employee.mobile;
        }
      }
    } else if (!userObj.branch && userObj.branchId) {
      const branch = await this._resolveBranch(userObj.branchId);
      if (branch) {
        userObj.branch = branch.name;
      }
    }
    return userObj;
  }

  async getAllUsers(filters = {}) {
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const branchIdentifier = filters.branchId || filters.branchName || filters.branch;
    if (branchIdentifier) {
      const branch = await this._resolveBranch(branchIdentifier);
      if (branch) {
        query.$or = [
          { branchId: branch._id },
          { branchId: branch._id.toString() },
          { branch: new RegExp(`^${branch.name}$`, "i") },
          { location: new RegExp(`^${branch.name}$`, "i") },
        ];
      } else {
        query.$or = [
          { branchId: branchIdentifier },
          { branch: new RegExp(`^${branchIdentifier}$`, "i") },
          { location: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
      }
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    return Promise.all(users.map((u) => this._enrichUser(u)));
  }

  async getUserById(id) {
    if (!id) {
      throw ApiError.badRequest("User ID is required");
    }
    const user = await User.findOne(this._buildIdQuery(id)).select("-password");
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return this._enrichUser(user);
  }

  async createUser(userData, caller = {}, requestContext = {}) {
    if (!userData.employeeId) {
      throw ApiError.badRequest("employeeId is required to create a user account.");
    }

    const empId = userData.employeeId._id ? userData.employeeId._id : userData.employeeId;
    if (!mongoose.Types.ObjectId.isValid(empId)) {
      throw ApiError.badRequest("Invalid employeeId format.");
    }

    const employee = await Employee.findById(empId)
      .populate("roleId", "code name")
      .populate("branchId", "name code")
      .lean();

    if (!employee) {
      throw ApiError.badRequest("Specified employee does not exist.");
    }

    if (employee.employmentStatus !== "ACTIVE" || !employee.isActive) {
      throw ApiError.badRequest("Cannot create user account for an inactive or departed employee.");
    }

    const empObjectId = new mongoose.Types.ObjectId(empId.toString());
    const empStr = empId.toString();

    const existingLinkedUser = await User.findOne({
      $or: [
        { employeeId: empObjectId },
        { employeeId: empStr },
      ],
      status: { $ne: "DISABLED" },
      isActive: true,
    });

    if (existingLinkedUser) {
      throw ApiError.conflict("Employee is already linked to an active user account (1:1 constraint).");
    }

    const email = (
      userData.email ||
      employee.email ||
      ""
    ).toLowerCase().trim();

    if (!email) {
      throw ApiError.badRequest("Email is required to create a user account.");
    }

    const username = (
      userData.username ||
      userData.email ||
      employee.email ||
      ""
    ).toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict(`User with email '${email}' already exists.`);
    }

    if (username && username !== email) {
      const existingUsernameUser = await User.findOne({ username });
      if (existingUsernameUser) {
        throw ApiError.conflict(`User with username '${username}' already exists.`);
      }
    }

    const derivedRoleIds = employee.roleId ? [employee.roleId._id || employee.roleId] : [];
    const derivedBranchIds = employee.branchId ? [employee.branchId._id || employee.branchId] : [];
    const derivedBranchId = employee.branchId ? (employee.branchId._id || employee.branchId) : null;
    const derivedBranchName = employee.branchId ? (employee.branchId.name || "") : "";

    let derivedRole = "staff";
    let derivedRoleCode = "STAFF";
    if (employee.roleId) {
      if (typeof employee.roleId === "object" && employee.roleId.code) {
        derivedRoleCode = employee.roleId.code;
        derivedRole = employee.roleId.code.toLowerCase();
      } else {
        const foundRole = await Role.findById(employee.roleId).lean();
        if (foundRole && foundRole.code) {
          derivedRoleCode = foundRole.code;
          derivedRole = foundRole.code.toLowerCase();
        }
      }
    }

    const password = userData.password || (crypto.randomBytes(16).toString("hex") + "!A1");

    const userPayload = {
      name: employee.name,
      username,
      email,
      password,
      phone: employee.mobile || "",
      branch: derivedBranchName,
      branchId: derivedBranchId,
      branchIds: derivedBranchIds,
      roleIds: derivedRoleIds,
      employeeId: employee._id,
      role: derivedRole,
      status: "ACTIVE",
      permissions: {},
      profilePicUrl: null,
      needsReview: false,
      isActive: true,
    };

    const user = new User(userPayload);
    await user.save();

    await this._auditLog({
      event: "USER_CREATED",
      action: "USER_CREATE",
      userId: caller._id || caller.id || caller.userId,
      userEmail: caller.email,
      resourceType: "User",
      resourceId: user._id,
      branchId: user.branchId,
      after: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        roleIds: user.roleIds,
        branchId: user.branchId,
        branchIds: user.branchIds,
        employeeId: user.employeeId,
        status: user.status,
      },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
    });

    return this._enrichUser(user);
  }

  async updateUser(id, updateData, caller = {}, requestContext = {}) {
    if (!id) {
      throw ApiError.badRequest("User ID is required");
    }

    const user = await User.findOne(this._buildIdQuery(id));
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (updateData.password) {
      user.password = updateData.password;
    }
    if (updateData.name) user.name = updateData.name;
    if (updateData.email) user.email = updateData.email.toLowerCase().trim();
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.branch !== undefined) user.branch = updateData.branch;
    if (updateData.branchId !== undefined) user.branchId = updateData.branchId;
    if (updateData.location !== undefined) user.location = updateData.location;
    if (updateData.role) user.role = updateData.role;
    if (updateData.permissions !== undefined) user.permissions = updateData.permissions;
    if (updateData.profilePicUrl !== undefined) user.profilePicUrl = updateData.profilePicUrl;
    if (updateData.needsReview !== undefined) user.needsReview = updateData.needsReview;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;

    if (user.branch && !user.branchId) {
      const branch = await this._resolveBranch(user.branch);
      if (branch) user.branchId = branch._id;
    }

    await user.save();
    const updated = await User.findOne(this._buildIdQuery(id)).select("-password");
    return this._enrichUser(updated);
  }

  async deleteUser(id, caller = {}, requestContext = {}) {
    if (!id) {
      throw ApiError.badRequest("User ID is required");
    }

    const user = await User.findOne(this._buildIdQuery(id));
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    await User.deleteOne(this._buildIdQuery(id));

    await this._auditLog({
      event: "USER_DELETED",
      action: "USER_DELETE",
      userId: caller._id || caller.id || caller.userId,
      userEmail: caller.email,
      resourceType: "User",
      resourceId: id,
      branchId: user.branchId,
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
    });

    return { _id: id, message: "User deleted successfully" };
  }

  async lockUser(userId, { reason = "Manual lock by administrator", lockoutMinutes = 15 } = {}, caller = {}, requestContext = {}) {
    if (!userId) {
      throw ApiError.badRequest("User ID is required");
    }

    const user = await User.findOne(this._buildIdQuery(userId));
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const lockoutEnd = new Date(Date.now() + (parseInt(lockoutMinutes, 10) || 15) * 60 * 1000);
    const beforeState = { status: user.status, lockoutEnd: user.lockoutEnd };

    user.status = "LOCKED";
    user.lockoutEnd = lockoutEnd;
    await user.save();

    await this._auditLog({
      event: "USER_LOCKED",
      action: "USER_LOCKED",
      userId: caller._id || caller.id || caller.userId,
      userEmail: caller.email,
      resourceType: "User",
      resourceId: user._id,
      branchId: user.branchId,
      before: beforeState,
      after: { status: "LOCKED", lockoutEnd },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
      reason,
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    return userObj;
  }

  async unlockUser(userId, { reason = "Manual unlock by administrator" } = {}, caller = {}, requestContext = {}) {
    if (!userId) {
      throw ApiError.badRequest("User ID is required");
    }

    const user = await User.findOne(this._buildIdQuery(userId));
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const beforeState = { status: user.status, lockoutEnd: user.lockoutEnd };

    user.status = "ACTIVE";
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.lockoutEnd = null;
    await user.save();

    await this._auditLog({
      event: "USER_UNLOCKED",
      action: "USER_UNLOCKED",
      userId: caller._id || caller.id || caller.userId,
      userEmail: caller.email,
      resourceType: "User",
      resourceId: user._id,
      branchId: user.branchId,
      before: beforeState,
      after: { status: "ACTIVE", lockoutEnd: null },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
      reason,
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    return userObj;
  }

  async disableUser(userId, { reason = "Manual disable by administrator" } = {}, caller = {}, requestContext = {}) {
    if (!userId) {
      throw ApiError.badRequest("User ID is required");
    }

    const user = await User.findOne(this._buildIdQuery(userId));
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const beforeState = { status: user.status, isActive: user.isActive };

    user.status = "DISABLED";
    user.isActive = false;
    await user.save();

    await this._auditLog({
      event: "USER_DISABLED",
      action: "USER_DISABLED",
      userId: caller._id || caller.id || caller.userId,
      userEmail: caller.email,
      resourceType: "User",
      resourceId: user._id,
      branchId: user.branchId,
      before: beforeState,
      after: { status: "DISABLED", isActive: false },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
      reason,
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    return userObj;
  }

  async enableUser(userId, { reason = "Manual enable by administrator" } = {}, caller = {}, requestContext = {}) {
    if (!userId) {
      throw ApiError.badRequest("User ID is required");
    }

    const user = await User.findOne(this._buildIdQuery(userId));
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const beforeState = { status: user.status, isActive: user.isActive };

    user.status = "ACTIVE";
    user.isActive = true;
    await user.save();

    await this._auditLog({
      event: "USER_ENABLED",
      action: "USER_ENABLED",
      userId: caller._id || caller.id || caller.userId,
      userEmail: caller.email,
      resourceType: "User",
      resourceId: user._id,
      branchId: user.branchId,
      before: beforeState,
      after: { status: "ACTIVE", isActive: true },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
      reason,
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    return userObj;
  }

  async _auditLog(data) {
    try {
      await AuditLog.create({
        action: data.action || data.event,
        resource: data.resourceType || "User",
        resourceId: data.resourceId && mongoose.Types.ObjectId.isValid(data.resourceId) ? data.resourceId : null,
        userId: data.userId && mongoose.Types.ObjectId.isValid(data.userId) ? data.userId : null,
        userName: data.userEmail || "System",
        userRole: data.userRole || "",
        branchId: data.branchId && mongoose.Types.ObjectId.isValid(data.branchId) ? data.branchId : null,
        details: {
          event: data.event,
          reason: data.reason,
          status: data.status,
          before: data.before,
          after: data.after,
        },
        ipAddress: data.ipAddress,
      });
    } catch (_) {
      // Don't crash on audit log failure
    }
  }
}

module.exports = new UserService();
