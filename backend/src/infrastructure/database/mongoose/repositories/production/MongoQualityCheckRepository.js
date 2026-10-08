const IQualityCheckRepository = require("../../../../../domain/repositories/production/IQualityCheckRepository");
const QualityCheck = require("../../models/QualityCheck");
const ProductionOrder = require("../../models/ProductionOrder");

class MongoQualityCheckRepository extends IQualityCheckRepository {
  async findPending(branchId = null) {
    const filter = { status: "QC" };
    if (branchId) filter.branchId = branchId;

    return ProductionOrder.find(filter)
      .populate("jobOrderId", "jobNo title customerName dueDate priority items")
      .populate("branchId", "name code")
      .populate("machineId", "printerName brand model")
      .populate("assignedEmployeeIds", "name email role")
      .sort({ updatedAt: -1 })
      .lean();
  }

  async findAll(query = {}) {
    const filter = {};
    if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
    if (query.productionOrderId) filter.productionOrderId = query.productionOrderId;
    if (query.result) filter.result = query.result;
    if (query.checkedBy) filter.checkedBy = query.checkedBy;

    if (query.from || query.to) {
      filter.checkedAt = {};
      if (query.from) filter.checkedAt.$gte = new Date(query.from);
      if (query.to) filter.checkedAt.$lte = new Date(query.to);
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      QualityCheck.find(filter)
        .populate("jobOrderId", "jobNo title customerName dueDate")
        .populate("productionOrderId", "productionNo plannedQty actualQty")
        .populate("checkedBy", "name email role")
        .sort({ checkedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QualityCheck.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findById(id) {
    return QualityCheck.findById(id)
      .populate("jobOrderId")
      .populate("productionOrderId")
      .populate("checkedBy", "name email role")
      .populate("reprintRequestId")
      .lean();
  }

  async findByProductionOrder(productionOrderId) {
    return QualityCheck.find({ productionOrderId })
      .populate("checkedBy", "name email role")
      .sort({ checkedAt: -1 })
      .lean();
  }

  async create(data) {
    return QualityCheck.create(data);
  }

  async update(id, updateData) {
    return QualityCheck.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async countDocuments(filter = {}) {
    return QualityCheck.countDocuments(filter);
  }
}

module.exports = new MongoQualityCheckRepository();
