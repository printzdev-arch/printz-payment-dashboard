const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userName: {
      type: String,
      default: "System",
    },
    userRole: {
      type: String,
      default: "",
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema, "auditLogs");


// === INJECTED REPOSITORY STATICS ===

auditLogSchema.statics.findAll = async function (query = {}, { page = 1, limit = 50, sort = { timestamp: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("actorId", "name email username")
      .populate("branchId", "name code")
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    records,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit) || 1,
  };
};

auditLogSchema.statics.findByEntity = async function (entityType, entityId, { page = 1, limit = 50 } = {}) {
  const query = {
    entityType: String(entityType).trim(),
    entityId: mongoose.Types.ObjectId.isValid(entityId)
      ? new mongoose.Types.ObjectId(entityId)
      : entityId,
  };
  return this.findAll(query, { page, limit });
};

auditLogSchema.statics.findLogins = async function (filter = {}, { page = 1, limit = 50 } = {}) {
  const query = {
    ...filter,
    action: { $in: ["LOGIN", "LOGIN_FAILED", "LOGOUT"] },
  };
  return this.findAll(query, { page, limit });
};

auditLogSchema.statics.findByEmployee = async function (employeeId, { page = 1, limit = 50 } = {}) {
  const empId = mongoose.Types.ObjectId.isValid(employeeId)
    ? new mongoose.Types.ObjectId(employeeId)
    : employeeId;
  const query = {
    $or: [{ actorEmployeeId: empId }, { actorId: empId }],
  };
  return this.findAll(query, { page, limit });
};

auditLogSchema.statics.getSummary = async function (query = {}) {
  const [totalLogs, uniqueActors, actions] = await Promise.all([
    this.countDocuments(query),
    this.distinct("actorId", query),
    this.aggregate([
      { $match: query },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    totalLogs,
    uniqueActorsCount: uniqueActors.length,
    topActions: actions.map((a) => ({ action: a._id, count: a.count })),
  };
};


if (typeof auditLogSchema !== "undefined" && typeof AuditLog !== "undefined" && auditLogSchema.statics) {
  Object.assign(AuditLog, auditLogSchema.statics);
}

module.exports = AuditLog;
