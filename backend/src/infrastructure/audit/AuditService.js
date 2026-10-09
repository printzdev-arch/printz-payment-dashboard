const AuditHelper = require("../../shared/utils/common/AuditHelper");

class AuditService {
  /**
   * Records an audit event asynchronously
   * @param {Object} entry
   */
  async log({
    event,
    action,
    userId = null,
    userEmail = null,
    resourceType,
    resourceId = null,
    beforeState = null,
    afterState = null,
    ipAddress = null,
    userAgent = null,
    status = "SUCCESS",
    metadata = {},
    reason = null,
    branchId = null,
    session = null,
  }) {
    try {
      await AuditHelper.log({
        actorId: userId,
        actorName: userEmail,
        action: (action || event || "SYSTEM").toUpperCase(),
        entityType: (resourceType || "SYSTEM").toUpperCase(),
        entityId: resourceId,
        before: beforeState,
        after: afterState,
        branchId,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error(`[AUDIT_ERROR] Failed to record audit entry for '${event || action}':`, err.message);
    }
  }

  _sanitize(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const cloned = JSON.parse(JSON.stringify(obj));
    const redactKeys = [
      "password",
      "passwordHash",
      "refreshToken",
      "accessToken",
      "token",
      "secret",
      "resetPasswordToken",
    ];

    const redactDeep = (target) => {
      if (!target || typeof target !== "object") return;
      for (const key of Object.keys(target)) {
        if (redactKeys.includes(key)) {
          target[key] = "[REDACTED]";
        } else if (typeof target[key] === "object") {
          redactDeep(target[key]);
        }
      }
    };

    redactDeep(cloned);
    return cloned;
  }
}

module.exports = new AuditService();
