const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const User = require("../../../infrastructure/database/mongoose/models/User");
const auditService = require("../../../infrastructure/audit/AuditService");

class LoginUser {
  constructor({ userRepository, tokenService, passwordService }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.passwordService = passwordService;
  }

  async execute({ email, identifier, password }, requestContext = {}) {
    const loginKey = email || identifier;
    if (!loginKey) {
      throw ErrorHelper.badRequest("Email or phone number is required");
    }
    if (!password) {
      throw ErrorHelper.badRequest("Password is required");
    }

    const user = this.userRepository.findByEmailOrPhone
      ? await this.userRepository.findByEmailOrPhone(loginKey)
      : await this.userRepository.findByEmail(loginKey);

    if (!user) {
      await auditService.log({
        event: "AUTH_LOGIN_FAILED",
        action: "LOGIN_FAILED",
        userEmail: loginKey,
        resourceType: "User",
        ipAddress: requestContext.ip,
        userAgent: requestContext.userAgent,
        status: "FAILED",
        reason: "User not found",
      });
      throw ErrorHelper.unauthorized("Invalid email or password");
    }

    // 1. Check Disabled / Inactive status
    if (user.status === "DISABLED" || !user.isActive) {
      await auditService.log({
        event: "AUTH_LOGIN_FAILED",
        action: "LOGIN_FAILED",
        userId: user._id,
        userEmail: user.email,
        resourceType: "User",
        resourceId: user._id,
        ipAddress: requestContext.ip,
        userAgent: requestContext.userAgent,
        status: "FAILED",
        reason: "Account disabled/inactive",
      });
      throw ErrorHelper.forbidden("Account has been disabled. Please contact an administrator.", "ACCOUNT_DISABLED");
    }

    // 1b. Check linked Employee active status
    if (user.employeeId) {
      const Employee = require("../../../infrastructure/database/mongoose/models/Employee");
      const employee = await Employee.findById(user.employeeId).lean();
      if (!employee || employee.employmentStatus !== "ACTIVE" || !employee.isActive) {
        await auditService.log({
          event: "AUTH_LOGIN_FAILED",
          action: "LOGIN_FAILED",
          userId: user._id,
          userEmail: user.email,
          resourceType: "User",
          resourceId: user._id,
          ipAddress: requestContext.ip,
          userAgent: requestContext.userAgent,
          status: "FAILED",
          reason: "Linked employee profile is inactive or departed",
        });
        throw ErrorHelper.forbidden("Account access denied: Linked employee profile is inactive or departed.", "EMPLOYEE_INACTIVE");
      }
    }

    // 2. Check Locked status & Lockout expiry
    if (user.status === "LOCKED") {
      if (user.lockoutEnd && new Date(user.lockoutEnd) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.lockoutEnd) - new Date()) / 60000);
        await auditService.log({
          event: "AUTH_LOGIN_FAILED",
          action: "LOGIN_FAILED",
          userId: user._id,
          userEmail: user.email,
          resourceType: "User",
          resourceId: user._id,
          ipAddress: requestContext.ip,
          userAgent: requestContext.userAgent,
          status: "FAILED",
          reason: `Account locked. Remaining time: ${remainingMinutes}m`,
        });
        throw ErrorHelper.locked(
          `Account is temporarily locked due to consecutive failed attempts. Please try again in ${remainingMinutes} minute(s).`,
          "ACCOUNT_LOCKED"
        );
      } else if (!user.lockoutEnd) {
        throw ErrorHelper.locked(
          "Account is locked. Please contact an administrator to unlock your account.",
          "ACCOUNT_LOCKED"
        );
      } else {
        // Lockout period has elapsed -> automatically unlock
        await User.findByIdAndUpdate(user._id, {
          $set: { status: "ACTIVE", failedLoginAttempts: 0, lastFailedLoginAt: null, lockoutEnd: null },
        });
        user.status = "ACTIVE";
        user.failedLoginAttempts = 0;
        user.lastFailedLoginAt = null;
        user.lockoutEnd = null;
      }
    }

    // 3. Verify Password
    if (!user.password) {
      throw ErrorHelper.unauthorized("Invalid email or password");
    }
    const isMatch = await this.passwordService.comparePassword(password, user.password);
    if (!isMatch) {
      const now = new Date();
      const windowMs = 15 * 60 * 1000;
      const windowStart = new Date(now.getTime() - windowMs);

      // Atomic update for rolling 15-minute window counter to prevent concurrent bypass
      let updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          lastFailedLoginAt: { $gte: windowStart },
        },
        {
          $inc: { failedLoginAttempts: 1 },
          $set: { lastFailedLoginAt: now },
        },
        { new: true }
      );

      if (!updatedUser) {
        // Outside 15-minute rolling window or first failure -> reset counter to 1
        updatedUser = await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              failedLoginAttempts: 1,
              lastFailedLoginAt: now,
            },
          },
          { new: true }
        );
      }

      const currentAttempts = updatedUser ? updatedUser.failedLoginAttempts : 1;
      let isNowLocked = false;

      if (currentAttempts >= 5) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            status: "LOCKED",
            lockoutEnd: new Date(now.getTime() + windowMs),
          },
        });
        isNowLocked = true;
      }

      await auditService.log({
        event: isNowLocked ? "AUTH_ACCOUNT_LOCKED" : "AUTH_LOGIN_FAILED",
        action: isNowLocked ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        userId: user._id,
        userEmail: user.email,
        resourceType: "User",
        resourceId: user._id,
        ipAddress: requestContext.ip,
        userAgent: requestContext.userAgent,
        status: "FAILED",
        reason: isNowLocked
          ? "Account locked after 5 failed login attempts within 15 minutes"
          : `Invalid password (Attempt ${currentAttempts}/5)`,
      });

      if (isNowLocked) {
        throw ErrorHelper.locked(
          "Account has been locked for 15 minutes due to 5 consecutive failed login attempts.",
          "ACCOUNT_LOCKED"
        );
      }

      throw ErrorHelper.unauthorized("Invalid email or password");
    }

    // 4. Successful Login -> reset counters & record lastLoginAt
    await User.findByIdAndUpdate(user._id, {
      $set: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutEnd: null,
        status: "ACTIVE",
        lastLoginAt: new Date(),
      },
    });

    const userId = (user._id || user.id || "").toString();
    const tokenPayload = {
      userId,
      role: user.role,
      branch: user.branch,
      email: user.email,
    };

    const tokenPair = this.tokenService.generateTokenPair(tokenPayload);

    // Audit successful login
    await auditService.log({
      event: "AUTH_LOGIN_SUCCESS",
      action: "LOGIN",
      userId: user._id,
      userEmail: user.email,
      resourceType: "User",
      resourceId: user._id,
      branchId: user.branchId,
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
    });

    return {
      accessToken: tokenPair.accessToken,
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        branch: user.branch,
        branchId: user.branchId,
        branchIds: user.branchIds || [],
        roleIds: user.roleIds || [],
        employeeId: user.employeeId || null,
        location: user.location,
        role: user.role,
        status: "ACTIVE",
        permissions: user.permissions,
        isActive: user.isActive,
      },
    };
  }
}

module.exports = LoginUser;

