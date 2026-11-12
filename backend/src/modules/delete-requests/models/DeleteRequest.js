const mongoose = require("mongoose");

/**
 * A manager's request to delete a record. The record stays in place until an admin approves it.
 * Approving removes the record; rejecting leaves it untouched.
 */
const DeleteRequestSchema = new mongoose.Schema(
  {
    // Key from modules/delete-requests/registry.js, for example "stockItem" or "customer"
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, required: true },
    // What the record was called when the request was made, so the admin can still read it after deletion
    resourceLabel: { type: String, default: "" },
    branchId: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    branchName: { type: String, default: "" },

    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    requestedBy: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    requestedByName: { type: String, default: "" },
    requestedAt: { type: Date, default: Date.now },

    decidedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    decidedByName: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: "" },

    // Set when an approved delete could not be carried out; the request goes back to PENDING
    executionError: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false, collection: "deleteRequests" }
);

DeleteRequestSchema.index({ resourceType: 1, resourceId: 1, status: 1 });
// Request list is ordered by request time, for everyone (admin) or for the requester
DeleteRequestSchema.index({ requestedAt: -1 });
DeleteRequestSchema.index({ requestedBy: 1, requestedAt: -1 });
DeleteRequestSchema.index({ status: 1, requestedAt: -1 });

module.exports = mongoose.models.DeleteRequest || mongoose.model("DeleteRequest", DeleteRequestSchema);
