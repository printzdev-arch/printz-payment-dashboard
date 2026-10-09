const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * JwtTokenService
 * Infrastructure service implementing Access and Refresh token generation & verification.
 */
class JwtTokenService {
  constructor() {
    this.accessSecret = env.JWT_ACCESS_SECRET || env.JWT_SECRET;
    this.accessExpiresIn = env.JWT_ACCESS_EXPIRES_IN || env.JWT_EXPIRES_IN || "15m";
    this.refreshSecret = env.JWT_REFRESH_SECRET;
    this.refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN || "7d";

    if (env.isProduction && (!this.accessSecret || !this.refreshSecret)) {
      throw new Error(
        "[FATAL SECURITY ERROR] JwtTokenService cannot initialize in production without JWT_ACCESS_SECRET and JWT_REFRESH_SECRET."
      );
    }

    this.secret = this.accessSecret;
    this.expiresIn = this.accessExpiresIn;
  }

  /**
   * Generate an Access Token (short-lived)
   */
  generateAccessToken(payload) {
    if (!this.accessSecret) {
      throw new Error("JWT Access Secret is not configured.");
    }
    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
    });
  }

  /**
   * Generate a Refresh Token (long-lived)
   */
  generateRefreshToken(payload) {
    if (!this.refreshSecret) {
      throw new Error("JWT Refresh Secret is not configured.");
    }
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
    });
  }

  /**
   * Generate both Access Token and Refresh Token in a single pair
   */
  generateTokenPair(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({ userId: payload.userId, email: payload.email });
    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: this.accessExpiresIn,
    };
  }

  /**
   * Backward-compatible alias for generateAccessToken
   */
  generateToken(payload) {
    return this.generateAccessToken(payload);
  }

  /**
   * Verify an Access Token
   */
  verifyAccessToken(token) {
    if (!this.accessSecret) {
      throw new Error("JWT Access Secret is not configured.");
    }
    return jwt.verify(token, this.accessSecret);
  }

  /**
   * Verify a Refresh Token
   */
  verifyRefreshToken(token) {
    if (!this.refreshSecret) {
      throw new Error("JWT Refresh Secret is not configured.");
    }
    return jwt.verify(token, this.refreshSecret);
  }

  /**
   * Backward-compatible alias for verifyAccessToken
   */
  verifyToken(token) {
    return this.verifyAccessToken(token);
  }
}

module.exports = new JwtTokenService();
