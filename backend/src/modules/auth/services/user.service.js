const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const { runPaged, attachPaging } = require("../../../utils/helpers/pagination");
const Role = require("../models/Role");
const Branch = require("../../branches/models/Branch");
const Employee = require("../../employees/models/Employee");
const ApiError = require("../../../utils/errors/ApiError");
const { employeeDisallowsLogin } = require("../../employees/services/roleLogin.helper");

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

    const users = await runPaged(
      () => User.find(query).select("-password").sort({ createdAt: -1 }),
      () => User.countDocuments(query),
      filters
    );
    // Enriching a user takes several lookups, so with paging only the requested page is enriched
    const enriched = await Promise.all(users.map((u) => this._enrichUser(u)));
    return users.paging ? attachPaging(enriched, users.paging) : enriched;
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

  // Admin accounts are not tied to an employee record (they have no payroll,
  // attendance, etc.), so they are created directly from the submitted details.
  async _createStandaloneAdmin(userData, caller = {}, requestContext = {}) {
    if (!caller.isSuperAdmin) {
      throw ApiError.forbidden("Only an admin can create an admin account.");
    }

    const email = (userData.email || "").toLowerCase().trim();
    if (!email) {
      throw ApiError.badRequest("Email is required to create a user account.");
    }
    if (await User.findOne({ email })) {
      throw ApiError.conflict(`User with email '${email}' already exists.`);
    }

    const branchDoc = userData.branch ? await this._resolveBranch(userData.branch) : null;
    const branchId = branchDoc ? branchDoc._id : null;

    const user = new User({
      name: userData.name,
      username: (userData.username || email).toLowerCase().trim(),
      email,
      password: userData.password,
      phone: userData.phone || "",
      branch: branchDoc?.name || userData.branch || "",
      branchId,
      branchIds: branchId ? [branchId] : [],
      location: userData.location || "",
      role: "admin",
      status: "ACTIVE",
      permissions: userData.permissions || {},
      profilePicUrl: null,
      needsReview: false,
      isActive: true,
    });
    await user.save();

    return this._enrichUser(user);
  }

  async createUser(userData, caller = {}, requestContext = {}) {
    if (!userData.employeeId) {
      return this._createStandaloneAdmin(userData, caller, requestContext);
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

    // A login needs a role and pages, which are set in Role Setup
    if (!employee.roleId) {
      throw ApiError.badRequest("Set this employee's role and pages in Role Setup before creating a login.");
    }

    // Operators (and any role marked NO_LOGIN) never sign in
    const noLogin = await employeeDisallowsLogin(employee);
    if (noLogin.noLogin) {
      throw ApiError.badRequest(`${noLogin.name} has no pages assigned, so a login cannot be created. Tick at least one page first.`);
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

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    return userObj;
  }

}

module.exports = new UserService();
