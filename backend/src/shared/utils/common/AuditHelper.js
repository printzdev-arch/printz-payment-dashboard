const auditLogService = require("../../../application/services/common/auditLog.service");

class AuditHelper {
  /**
   * Reusable helper to record an audit log event anywhere in the system.
   *
   * @param {Object} params
   * @param {string|ObjectId} [params.actorId] - User ID who triggered the action
   * @param {string|ObjectId} [params.actorEmployeeId] - Linked Employee ID
   * @param {string} [params.actorName] - Display name of actor
   * @param {string} [params.actorType="USER"] - "USER" | "SYSTEM"
   * @param {string} params.action - Audit action (e.g. "CREATE", "UPDATE", "APPROVE", etc.)
   * @param {string} params.entityType - Entity type (e.g. "JOB_ORDER", "EMPLOYEE", etc.)
   * @param {string|ObjectId} params.entityId - Entity ID
   * @param {Object} [params.before] - Snapshot before change
   * @param {Object} [params.after] - Snapshot after change
   * @param {string|ObjectId} [params.branchId] - Branch scope
   * @param {string} [params.ipAddress] - Caller IP address
   * @param {string} [params.userAgent] - Caller User-Agent
   * @param {string} [params.sessionId] - Session ID
   * @param {Date} [params.timestamp] - Event timestamp
   */
  static async log({
    actorId = null,
    actorEmployeeId = null,
    actorName = null,
    actorType = "USER",
    action,
    entityType,
    entityId,
    before = null,
    after = null,
    branchId = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    timestamp = new Date(),
  }) {
    return auditLogService.log({
      actorId,
      actorEmployeeId,
      actorName,
      actorType,
      action,
      entityType,
      entityId,
      before,
      after,
      branchId,
      ipAddress,
      userAgent,
      sessionId,
      timestamp,
    });
  }
}

module.exports = AuditHelper;
