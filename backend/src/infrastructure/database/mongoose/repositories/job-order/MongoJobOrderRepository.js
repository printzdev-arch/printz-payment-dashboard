const IJobOrderRepository = require("../../../../../domain/repositories/job-order/IJobOrderRepository");
const JobOrder = require("../../models/job-order/JobOrder");

class MongoJobOrderRepository extends IJobOrderRepository {
  async findAll(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { ...query };
    delete filter.page;
    delete filter.limit;
    delete filter.sort;

    const [items, total] = await Promise.all([
      JobOrder.find(filter)
        .populate("branchId", "name code")
        .populate("designerId", "name email role")
        .populate("createdBy", "name email")
        .sort(query.sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobOrder.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async find(query = {}) {
    return JobOrder.find(query)
      .populate("branchId", "name code")
      .populate("designerId", "name email role")
      .populate("createdBy", "name email");
  }

  async findById(id) {
    return JobOrder.findById(id)
      .populate("branchId", "name code")
      .populate("designerId", "name email role")
      .populate("createdBy", "name email");
  }

  async findOne(query = {}) {
    return JobOrder.findOne(query)
      .populate("branchId", "name code")
      .populate("designerId", "name email role")
      .populate("createdBy", "name email");
  }

  async create(data) {
    return JobOrder.create(data);
  }

  async update(id, updateData) {
    return JobOrder.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async findOneAndUpdate(filter, updateData, options = { new: true }) {
    return JobOrder.findOneAndUpdate(filter, updateData, options);
  }

  async delete(id) {
    return JobOrder.findByIdAndDelete(id);
  }

  async countDocuments(filter = {}) {
    return JobOrder.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return JobOrder.aggregate(pipeline);
  }
}

module.exports = new MongoJobOrderRepository();
