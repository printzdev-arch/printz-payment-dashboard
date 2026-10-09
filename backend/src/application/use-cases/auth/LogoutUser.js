/**
 * LogoutUser Use Case
 * Handles user logout and session token revocation.
 */
class LogoutUser {
  constructor({ userRepository, tokenBlacklistService } = {}) {
    this.userRepository = userRepository;
    this.tokenBlacklistService = tokenBlacklistService;
  }

  async execute(input = {}) {
    const userId = typeof input === "object" ? input.userId : input;
    const accessToken = typeof input === "object" ? input.accessToken : null;
    const refreshToken = typeof input === "object" ? input.refreshToken : null;

    if (this.tokenBlacklistService) {
      if (accessToken) {
        this.tokenBlacklistService.blacklistToken(accessToken);
      }
      if (refreshToken) {
        this.tokenBlacklistService.blacklistToken(refreshToken);
      }
    }

    if (userId) {
      const auditService = require("../../../infrastructure/audit/AuditService");
      await auditService.log({
        event: "AUTH_LOGOUT",
        action: "LOGOUT",
        userId,
        resourceType: "User",
        resourceId: userId,
        ipAddress: typeof input === "object" ? input.ip : null,
        userAgent: typeof input === "object" ? input.userAgent : null,
        status: "SUCCESS",
      });
    }

    return {
      loggedOut: true,
      ...(userId ? { userId } : {}),
    };
  }
}

module.exports = LogoutUser;
