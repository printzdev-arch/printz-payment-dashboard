const mongoose = require("mongoose");

/**
 * One saved change to what a role or a person can open or do. Kept for good: nothing edits or removes these.
 * changes[] lists each page whose actions changed, with the actions before and after.
 */
const ChangeSchema = new mongoose.Schema(
  {
    page: { type: String, required: true },
    label: { type: String, default: "" },
    before: { type: [String], default: [] },
    after: { type: [String], default: [] },
  },
  { _id: false }
);

const PermissionAuditSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ["ROLE", "EMPLOYEE"], required: true, index: true },
    targetId: { type: String, required: true, index: true },
    targetName: { type: String, default: "" },
    event: { type: String, enum: ["CREATED", "UPDATED", "DELETED"], default: "UPDATED" },
    actorId: { type: String, default: "" },
    actorName: { type: String, default: "" },
    summary: { type: String, default: "" },
    changes: { type: [ChangeSchema], default: [] },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, collection: "permissionaudits" }
);

PermissionAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.models.PermissionAudit || mongoose.model("PermissionAudit", PermissionAuditSchema);
