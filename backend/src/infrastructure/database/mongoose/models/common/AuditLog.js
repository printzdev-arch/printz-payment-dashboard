const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
      index: true,
    },
    actorEmployeeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Employee",
      default: null,
      index: true,
    },
    actorName: {
      type: String,
      trim: true,
      default: null,
    },
    actorType: {
      type: String,
      enum: ["USER", "SYSTEM"],
      default: "USER",
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "auditLogs",
  }
);

// Compound Indexes specified in requirements
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ branchId: 1, timestamp: -1 });

module.exports = mongoose.models.CommonAuditLog || mongoose.model("CommonAuditLog", auditLogSchema);
