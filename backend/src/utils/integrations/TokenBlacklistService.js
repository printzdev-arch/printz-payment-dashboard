const jwt = require("jsonwebtoken");

/**
 * TokenBlacklistService
 * In-memory high-performance token revocation store with automatic TTL cleanup.
 * Prevents logged-out JWT access tokens and refresh tokens from being reused.
 */
class TokenBlacklistService {
  constructor() {
    // Map<tokenString, expiresAtTimestampMs>
    this.blacklistedTokens = new Map();

    // Auto-prune expired tokens every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.pruneExpiredTokens();
    }, 10 * 60 * 1000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Blacklist a token until its expiration time
   * @param {string} token - The JWT string
   * @param {number} [expiresInSeconds] - Optional explicit TTL in seconds
   */
  blacklistToken(token, expiresInSeconds) {
    if (!token || typeof token !== "string") return;

    let expiresAtMs;

    if (expiresInSeconds && typeof expiresInSeconds === "number") {
      expiresAtMs = Date.now() + expiresInSeconds * 1000;
    } else {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          expiresAtMs = decoded.exp * 1000;
        }
      } catch (e) {
        // Fallback: 24 hours
      }
    }

    if (!expiresAtMs) {
      expiresAtMs = Date.now() + 24 * 60 * 60 * 1000; // 24h fallback
    }

    this.blacklistedTokens.set(token.trim(), expiresAtMs);
  }

  /**
   * Check if a token has been revoked / blacklisted
   * @param {string} token - The JWT string
   * @returns {boolean}
   */
  isBlacklisted(token) {
    if (!token || typeof token !== "string") return false;

    const trimmedToken = token.trim();
    const expiresAt = this.blacklistedTokens.get(trimmedToken);

    if (!expiresAt) {
      return false;
    }

    // If expired, clean up and return false
    if (Date.now() > expiresAt) {
      this.blacklistedTokens.delete(trimmedToken);
      return false;
    }

    return true;
  }

  /**
   * Prune expired tokens to prevent memory growth
   */
  pruneExpiredTokens() {
    const now = Date.now();
    for (const [token, expiresAt] of this.blacklistedTokens.entries()) {
      if (now > expiresAt) {
        this.blacklistedTokens.delete(token);
      }
    }
  }

  /**
   * Clear all blacklisted tokens (for testing purposes)
   */
  clear() {
    this.blacklistedTokens.clear();
  }
}

module.exports = new TokenBlacklistService();
