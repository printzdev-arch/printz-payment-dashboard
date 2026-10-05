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

    return {
      loggedOut: true,
      ...(userId ? { userId } : {}),
    };
  }
}

module.exports = LogoutUser;
