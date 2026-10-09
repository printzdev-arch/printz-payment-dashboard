/**
 * AuditLog Domain Entity
 */
class AuditLog {
  constructor({
    id,
    _id,
    actorId = null,
    actorEmployeeId = null,
    actorName = null,
    actorType = "USER",
    action,
    entityType,
    entityId = null,
    before = null,
    after = null,
    branchId = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    timestamp = new Date(),
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.actorId = actorId;
    this.actorEmployeeId = actorEmployeeId;
    this.actorName = actorName;
    this.actorType = actorType; // "USER" | "SYSTEM"
    this.action = action; // "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "APPROVE", "REJECT", etc.
    this.entityType = entityType; // "JOB_ORDER", "EMPLOYEE", "APPROVAL", "PRINTER", "PAYMENT", etc.
    this.entityId = entityId;
    this.before = before;
    this.after = after;
    this.branchId = branchId;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.sessionId = sessionId;
    this.timestamp = timestamp ? new Date(timestamp) : new Date();
  }
}

module.exports = AuditLog;
