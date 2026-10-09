const crypto = require("crypto");
const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const Role = require("../../../infrastructure/database/mongoose/models/Role");
const Branch = require("../../../infrastructure/database/mongoose/models/Branch");
const Employee = require("../../../infrastructure/database/mongoose/models/Employee");
const User = require("../../../infrastructure/database/mongoose/models/User");
const auditService = require("../../../infrastructure/audit/AuditService");

class CreateUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userData, caller = {}, requestContext = {}) {
    // 1. Validate employeeId (MANDATORY link)
    if (!userData.employeeId) {
      throw ErrorHelper.badRequest("employeeId is required to create a user account.");
    }

    const empId = userData.employeeId._id ? userData.employeeId._id : userData.employeeId;
    if (!mongoose.Types.ObjectId.isValid(empId)) {
      throw ErrorHelper.badRequest("Invalid employeeId format.");
    }

    // 2. Fetch Employee from MongoDB (Single Source of Truth)
    const employee = await Employee.findById(empId)
      .populate("roleId", "code name")
      .populate("branchId", "name code")
      .lean();

    if (!employee) {
      throw ErrorHelper.badRequest("Specified employee does not exist.");
    }

    if (employee.employmentStatus !== "ACTIVE" || !employee.isActive) {
      throw ErrorHelper.badRequest("Cannot create user account for an inactive or departed employee.");
    }

    // 3. Ensure 1:1 Login per Employee
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
      throw ErrorHelper.conflict("Employee is already linked to an active user account (1:1 constraint).");
    }

    // 4. Resolve Email and Username
    const email = (
      userData.email ||
      employee.email ||
      ""
    ).toLowerCase().trim();

    if (!email) {
      throw ErrorHelper.badRequest("Email is required to create a user account.");
    }

    const username = (
      userData.username ||
      userData.email ||
      employee.email ||
      ""
    ).toLowerCase().trim();

    // Check email & username uniqueness in User collection
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw ErrorHelper.conflict(`User with email '${email}' already exists.`);
    }

    if (username && username !== email) {
      const existingUsernameUser = await User.findOne({ username });
      if (existingUsernameUser) {
        throw ErrorHelper.conflict(`User with username '${username}' already exists.`);
      }
    }

    // 5. Derive Role & Branch Access strictly from Employee (Do not trust client-submitted roleIds/branchIds)
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

    // 6. Resolve password credentials (hashed securely by User model pre-save hook)
    const password = userData.password || (crypto.randomBytes(16).toString("hex") + "!A1");

    // 7. Create User Payload
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

    const user = await this.userRepository.create(userPayload);

    // 8. Audit log
    await auditService.log({
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

    return user;
  }
}

module.exports = CreateUser;
