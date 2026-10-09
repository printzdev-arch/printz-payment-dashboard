const mongoose = require("mongoose");
const IAttachmentRepository = require("../../../../../domain/repositories/common/IAttachmentRepository");
const Attachment = require("../../models/common/Attachment");

class AttachmentRepository extends IAttachmentRepository {
  async create(data) {
    const entityId = data.entityId && mongoose.Types.ObjectId.isValid(String(data.entityId)) && String(data.entityId).length === 24
      ? new mongoose.Types.ObjectId(String(data.entityId))
      : data.entityId;

    const attachment = new Attachment({ ...data, entityId });
    return attachment.save();
  }

  async findByChecksumAndEntity(checksum, entityType, entityId) {
    const str = String(entityId).trim();
    const entityMatch = mongoose.Types.ObjectId.isValid(str) && str.length === 24
      ? { $in: [str, new mongoose.Types.ObjectId(str)] }
      : str;

    return Attachment.findOne({
      checksum,
      entityType: String(entityType).trim(),
      entityId: entityMatch,
    })
      .populate("uploadedBy", "name email username")
      .lean();
  }

  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return Attachment.findById(id)
      .populate("uploadedBy", "name email username")
      .lean();
  }

  async findAll(query = {}, { page = 1, limit = 50, sort = { createdAt: -1 } } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [records, total] = await Promise.all([
      Attachment.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("uploadedBy", "name email username")
        .lean(),
      Attachment.countDocuments(query),
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async deleteById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return Attachment.findByIdAndDelete(id).lean();
  }
}

module.exports = new AttachmentRepository();
