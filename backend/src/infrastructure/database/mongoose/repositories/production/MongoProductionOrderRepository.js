const IProductionOrderRepository = require("../../../../../domain/repositories/production/IProductionOrderRepository");
const ProductionOrder = require("../../models/ProductionOrder");

class MongoProductionOrderRepository extends IProductionOrderRepository {
  async findAll(query = {}) {
    const filter = {};

    if (query.branchId) filter.branchId = query.branchId;
    if (query.status) {
      filter.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
    }
    if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
    if (query.machineId) filter.machineId = query.machineId;
    if (query.priority) filter.priority = query.priority;

    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) filter.createdAt.$lte = new Date(query.to);
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ProductionOrder.find(filter)
        .populate("jobOrderId", "jobNo title customerName dueDate priority stage")
        .populate("branchId", "name code")
        .populate("machineId", "printerName model")
        .populate("assignedEmployeeIds", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductionOrder.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findActiveOrders(branchId = null) {
    const orderQuery = {
      status: { $in: ["PLANNED", "IN_PROGRESS"] },
    };
    if (branchId) orderQuery.branchId = branchId;

    return ProductionOrder.find(orderQuery)
      .select("_id jobOrderId branchId priority status plannedStart approvedSample")
      .populate("jobOrderId", "jobNo title customerName customerPhone dueDate priority stage")
      .populate("branchId", "name code")
      .lean();
  }

  async findById(id) {
    return ProductionOrder.findById(id);
  }

  async findByIdWithDetails(id) {
    return ProductionOrder.findById(id)
      .populate("jobOrderId")
      .populate("branchId", "name code address")
      .populate("machineId", "printerName brand model printerType")
      .populate("assignedEmployeeIds", "name email role phone")
      .lean();
  }

  async findOne(query = {}) {
    return ProductionOrder.findOne(query);
  }

  async find(query = {}) {
    return ProductionOrder.find(query);
  }

  async create(data) {
    return ProductionOrder.create(data);
  }

  async countDocuments(filter = {}) {
    return ProductionOrder.countDocuments(filter);
  }

  async countToday() {
    return ProductionOrder.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });
  }

  async update(id, updateData) {
    return ProductionOrder.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async save(doc) {
    return doc.save();
  }
}

module.exports = new MongoProductionOrderRepository();
