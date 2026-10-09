/**
 * API 01 - Authentication & RBAC Application Service
 */

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const env = require("../../../infrastructure/config/env");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const User = require("../../../infrastructure/database/mongoose/models/User");

class AuthService {
  static async login(emailOrUsername, password) {
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
      isActive: true,
    }).populate("roleId branchId employeeId");

    if (!user) {
      throw ErrorHelper.unauthorized("Invalid email or password.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw ErrorHelper.unauthorized("Invalid email or password.");
    }

    const payload = {
      userId: user._id,
      employeeId: user.employeeId?._id || user.employeeId,
      username: user.username,
      role: user.role,
      branchId: user.branchId?._id || user.branchId,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET || "secret", {
      expiresIn: env.JWT_EXPIRES_IN || "7d",
    });

    const refreshToken = jwt.sign({ userId: user._id }, env.JWT_SECRET || "secret", {
      expiresIn: "30d",
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRES_IN || "7d",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
    };
  }

  static async verifyToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET || "secret");
    } catch (err) {
      throw ErrorHelper.unauthorized("Invalid or expired access token.");
    }
  }
}

module.exports = AuthService;
