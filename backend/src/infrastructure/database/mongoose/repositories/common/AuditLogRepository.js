const mongoose = require("mongoose");
const IAuditLogRepository = require("../../../../../domain/repositories/common/IAuditLogRepository");
const AuditLog = require("../../models/common/AuditLog");

class AuditLogRepository extends IAuditLogRepository {
  async create(data) {
    const log = new AuditLog(data);
    return log.save();
  }

  async findAll(query = {}, { page = 1, limit = 50, sort = { timestamp: -1 } } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [records, total] = await Promise.all([
      AuditLog.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("actorId", "name email username")
        .populate("branchId", "name code")
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return AuditLog.findById(id)
      .populate("actorId", "name email username")
      .populate("branchId", "name code")
      .lean();
  }

  async findByEntity(entityType, entityId, { page = 1, limit = 50 } = {}) {
    const query = {
      entityType: String(entityType).trim(),
      entityId: mongoose.Types.ObjectId.isValid(entityId)
        ? new mongoose.Types.ObjectId(entityId)
        : entityId,
    };
    return this.findAll(query, { page, limit });
  }

  async findLogins(filter = {}, { page = 1, limit = 50 } = {}) {
    const query = {
      ...filter,
      action: { $in: ["LOGIN", "LOGIN_FAILED", "LOGOUT"] },
    };
    return this.findAll(query, { page, limit });
  }

  async findByEmployee(employeeId, { page = 1, limit = 50 } = {}) {
    const empId = mongoose.Types.ObjectId.isValid(employeeId)
      ? new mongoose.Types.ObjectId(employeeId)
      : employeeId;
    const query = {
      $or: [{ actorEmployeeId: empId }, { entityId: empId }],
    };
    return this.findAll(query, { page, limit });
  }

  async getSummary(query = {}) {
    const matchQuery = { ...query };

    const [totalCount, actionBreakdown, entityBreakdown, recentActivity] = await Promise.all([
      AuditLog.countDocuments(matchQuery),
      AuditLog.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$entityType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.find(matchQuery)
        .sort({ timestamp: -1 })
        .limit(10)
        .populate("actorId", "name email")
        .populate("branchId", "name code")
        .lean(),
    ]);

    return {
      totalLogs: totalCount,
      byAction: actionBreakdown.map((item) => ({ action: item._id, count: item.count })),
      byEntityType: entityBreakdown.map((item) => ({ entityType: item._id, count: item.count })),
      recentLogs: recentActivity,
    };
  }
}

module.exports = new AuditLogRepository();
