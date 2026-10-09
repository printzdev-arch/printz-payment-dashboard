const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    checksum: {
      type: String,
      required: true,
      trim: true,
    },
    storageProvider: {
      type: String,
      enum: ["LOCAL", "S3", "AZURE"],
      default: "LOCAL",
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "attachments",
  }
);

// Indexes specified in requirements
attachmentSchema.index({ entityType: 1, entityId: 1 });
attachmentSchema.index({ checksum: 1 });

module.exports = mongoose.models.CommonAttachment || mongoose.model("CommonAttachment", attachmentSchema);
