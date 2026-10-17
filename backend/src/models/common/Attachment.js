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


// === INJECTED REPOSITORY STATICS ===

attachmentSchema.statics.findByChecksumAndEntity = async function (checksum, entityType, entityId) {
  const str = String(entityId).trim();
  const entityMatch = mongoose.Types.ObjectId.isValid(str) && str.length === 24
    ? { $in: [str, new mongoose.Types.ObjectId(str)] }
    : str;

  return this.findOne({
    checksum,
    entityType: String(entityType).trim(),
    entityId: entityMatch,
  })
    .populate("uploadedBy", "name email username")
    .lean();
};

attachmentSchema.statics.findAll = async function (query = {}, { page = 1, limit = 50, sort = { createdAt: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("uploadedBy", "name email username")
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

attachmentSchema.statics.deleteById = async function (id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return this.findByIdAndDelete(id).lean();
};


module.exports = mongoose.models.CommonAttachment || mongoose.model("CommonAttachment", attachmentSchema);
