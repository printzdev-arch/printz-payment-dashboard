const IDeliveryOrderRepository = require("../../../../../domain/repositories/production/IDeliveryOrderRepository");
const DeliveryOrder = require("../../models/DeliveryOrder");

class MongoDeliveryOrderRepository extends IDeliveryOrderRepository {
  async findAll(query = {}) {
    const filter = {};
    if (query.branchId) filter.branchId = query.branchId;
    if (query.status) filter.status = query.status;
    if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      DeliveryOrder.find(filter)
        .populate("jobOrderId", "jobNo title customerName customerPhone dueDate priority")
        .populate("branchId", "name code")
        .populate("packedBy", "name email")
        .populate("dispatchedBy", "name email")
        .populate("deliveredBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryOrder.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findById(id) {
    return DeliveryOrder.findById(id);
  }

  async findByIdWithDetails(id) {
    return DeliveryOrder.findById(id)
      .populate("jobOrderId")
      .populate("branchId", "name code address")
      .populate("packedBy", "name email")
      .populate("dispatchedBy", "name email")
      .populate("deliveredBy", "name email")
      .lean();
  }

  async findOne(query = {}) {
    return DeliveryOrder.findOne(query);
  }

  async create(data) {
    return DeliveryOrder.create(data);
  }

  async upsert(filter, data) {
    return DeliveryOrder.findOneAndUpdate(
      filter,
      { $setOnInsert: data },
      { upsert: true, new: true }
    );
  }

  async update(id, updateData) {
    return DeliveryOrder.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async countDocuments(filter = {}) {
    return DeliveryOrder.countDocuments(filter);
  }
}

module.exports = new MongoDeliveryOrderRepository();
