const ErrorHelper = require("../../../shared/errors/ErrorHelper");

/**
 * RefreshToken Use Case
 * Validates provided refresh token and issues a new access token and refresh token.
 */
class RefreshToken {
  constructor({ userRepository, tokenService, tokenBlacklistService } = {}) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.tokenBlacklistService = tokenBlacklistService;
  }

  async execute({ refreshToken }) {
    if (!refreshToken) {
      throw ErrorHelper.badRequest("Refresh token is required");
    }

    if (this.tokenBlacklistService && this.tokenBlacklistService.isBlacklisted(refreshToken)) {
      throw ErrorHelper.unauthorized("Refresh token has been revoked. Please log in again.", "REFRESH_TOKEN_REVOKED");
    }

    let decoded;
    try {
      decoded = this.tokenService.verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw ErrorHelper.unauthorized("Refresh token expired. Please log in again.", "REFRESH_TOKEN_EXPIRED");
      }
      throw ErrorHelper.unauthorized("Invalid refresh token. Please authenticate.", "INVALID_REFRESH_TOKEN");
    }

    const userId = decoded.userId || decoded.id;
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw ErrorHelper.unauthorized("The user belonging to this token no longer exists.");
    }

    if (!user.isActive) {
      throw ErrorHelper.forbidden("Your account has been deactivated. Please contact an administrator.");
    }

    const tokenPayload = {
      userId: (user._id || user.id || "").toString(),
      role: user.role,
      branch: user.branch,
      email: user.email,
    };

    const tokenPair = this.tokenService.generateTokenPair(tokenPayload);

    // Blacklist old refresh token on rotation to prevent reuse
    if (this.tokenBlacklistService) {
      this.tokenBlacklistService.blacklistToken(refreshToken);
    }

    return {
      token: tokenPair.accessToken,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        _id: user._id,
        id: user._id,
        uid: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        branch: user.branch,
        branchId: user.branchId,
        location: user.location,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      },
    };
  }
}

module.exports = RefreshToken;
