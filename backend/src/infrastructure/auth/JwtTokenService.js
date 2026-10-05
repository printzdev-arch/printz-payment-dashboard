const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * JwtTokenService
 * Infrastructure service implementing Access and Refresh token generation & verification.
 */
class JwtTokenService {
  constructor() {
    this.accessSecret = env.JWT_ACCESS_SECRET || env.JWT_SECRET || "printz_default_access_secret_2026";
    this.accessExpiresIn = env.JWT_ACCESS_EXPIRES_IN || env.JWT_EXPIRES_IN || "15m";
    this.refreshSecret = env.JWT_REFRESH_SECRET || "printz_default_refresh_secret_2026";
    this.refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN || "7d";
    this.secret = this.accessSecret;
    this.expiresIn = this.accessExpiresIn;
  }

  /**
   * Generate an Access Token (short-lived)
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
    });
  }

  /**
   * Generate a Refresh Token (long-lived)
   */
  generateRefreshToken(payload) {
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
      token: accessToken, // Backward compatibility
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
    return jwt.verify(token, this.accessSecret);
  }

  /**
   * Verify a Refresh Token
   */
  verifyRefreshToken(token) {
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
