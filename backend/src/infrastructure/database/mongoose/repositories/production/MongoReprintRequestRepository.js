const IReprintRequestRepository = require("../../../../../domain/repositories/production/IReprintRequestRepository");
const ReprintRequest = require("../../models/ReprintRequest");

class MongoReprintRequestRepository extends IReprintRequestRepository {
  async findAll(query = {}) {
    const filter = {};
    if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
    if (query.status) filter.status = query.status;

    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) filter.createdAt.$lte = new Date(query.to);
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ReprintRequest.find(filter)
        .populate("jobOrderId", "jobNo title customerName dueDate priority")
        .populate("requestedBy", "name email role")
        .populate("approvedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReprintRequest.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async find(query = {}) {
    return ReprintRequest.find(query);
  }

  async findById(id) {
    return ReprintRequest.findById(id);
  }

  async findOne(query = {}) {
    return ReprintRequest.findOne(query);
  }

  async create(data) {
    return ReprintRequest.create(data);
  }

  async update(id, updateData) {
    return ReprintRequest.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async countDocuments(filter = {}) {
    return ReprintRequest.countDocuments(filter);
  }
}

module.exports = new MongoReprintRequestRepository();
