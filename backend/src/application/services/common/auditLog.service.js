const auditLogRepository = require("../../../infrastructure/database/mongoose/repositories/common/AuditLogRepository");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

// Sensitive fields to mask in audit snapshots
const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "newPassword",
  "oldPassword",
  "confirmPassword",
  "aadhaarNumber",
  "panNumber",
];

function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean = { ...obj };
  for (const key of Object.keys(clean)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s.toLowerCase()))) {
      clean[key] = "••••••••";
    } else if (key === "bankDetails" && clean[key] && typeof clean[key] === "object") {
      clean[key] = { ...clean[key] };
      if (clean[key].accountNumber) {
        clean[key].accountNumber = "••••••••" + String(clean[key].accountNumber).slice(-4);
      }
    } else if (typeof clean[key] === "object" && clean[key] !== null) {
      clean[key] = sanitizeObject(clean[key]);
    }
  }
  return clean;
}

class AuditLogService {
  constructor(repository = auditLogRepository) {
    this.repository = repository;
  }

  /**
   * Internal reusable helper to write an audit log entry.
   */
  async log(auditData = {}) {
    try {
      const sanitized = {
        ...auditData,
        before: sanitizeObject(auditData.before),
        after: sanitizeObject(auditData.after),
        timestamp: auditData.timestamp || new Date(),
      };
      return await this.repository.create(sanitized);
    } catch (err) {
      // Non-blocking: audit failure should not crash main business transaction, but log error
      console.error("[AuditLogService] Failed to record audit log:", err.message);
      return null;
    }
  }

  /**
   * Build MongoDB query constraint from RBAC authContext
   */
  _applyScopeConstraint(baseQuery = {}, authContext = {}) {
    const query = { ...baseQuery };
    if (authContext.isSuperAdmin) {
      return query;
    }

    const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);

    const scopes = authContext.scopes || [];

    if (scopes.includes("ALL")) {
      return query;
    }

    if (scopes.includes("BRANCH")) {
      if (authorizedBranches.length > 0) {
        query.branchId = { $in: authorizedBranches };
      } else {
        // No branch access -> match nothing
        query.branchId = "__NO_BRANCH_ACCESS__";
      }
      return query;
    }

    // SELF or ASSIGNED scope
    const userId = authContext.user?._id || authContext.user?.id;
    const employeeId = authContext.user?.employeeId;
    const orConditions = [];
    if (userId) orConditions.push({ actorId: userId });
    if (employeeId) orConditions.push({ actorEmployeeId: employeeId });

    if (orConditions.length > 0) {
      query.$or = orConditions;
    } else {
      query.actorId = "__NO_ACCESS__";
    }

    return query;
  }

  async getAuditLogs(filters = {}, pagination = {}, authContext = {}) {
    const query = this._applyScopeConstraint(filters, authContext);
    return this.repository.findAll(query, pagination);
  }

  async getAuditLogById(id, authContext = {}) {
    const log = await this.repository.findById(id);
    if (!log) {
      throw ErrorHelper.notFound("Audit log not found");
    }

    // Scope check on single item
    if (!authContext.isSuperAdmin && !(authContext.scopes || []).includes("ALL")) {
      const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
        .map((b) => (b._id ? b._id.toString() : b.toString()))
        .filter(Boolean);

      if ((authContext.scopes || []).includes("BRANCH")) {
        const logBranch = log.branchId?._id
          ? log.branchId._id.toString()
          : log.branchId?.toString();
        if (!logBranch || !authorizedBranches.includes(logBranch)) {
          throw ErrorHelper.forbidden("Access denied to this audit log record");
        }
      } else {
        // SELF / ASSIGNED
        const userId = (authContext.user?._id || authContext.user?.id)?.toString();
        const empId = authContext.user?.employeeId?.toString();
        const actorIdStr = log.actorId?._id ? log.actorId._id.toString() : log.actorId?.toString();
        const empIdStr = log.actorEmployeeId?.toString();

        if (actorIdStr !== userId && empIdStr !== empId) {
          throw ErrorHelper.forbidden("Access denied to this audit log record");
        }
      }
    }

    return log;
  }

  async getEntityAuditLogs(entityType, entityId, pagination = {}, authContext = {}) {
    const query = this._applyScopeConstraint(
      {
        entityType: String(entityType).trim(),
        entityId,
      },
      authContext
    );
    return this.repository.findAll(query, pagination);
  }

  async getLoginAuditLogs(filters = {}, pagination = {}, authContext = {}) {
    const query = this._applyScopeConstraint(filters, authContext);
    return this.repository.findLogins(query, pagination);
  }

  async getEmployeeActivity(employeeId, pagination = {}, authContext = {}) {
    const query = this._applyScopeConstraint({}, authContext);
    return this.repository.findByEmployee(employeeId, pagination);
  }

  async getSummary(filters = {}, authContext = {}) {
    const query = this._applyScopeConstraint(filters, authContext);
    return this.repository.getSummary(query);
  }
}

module.exports = new AuditLogService();
