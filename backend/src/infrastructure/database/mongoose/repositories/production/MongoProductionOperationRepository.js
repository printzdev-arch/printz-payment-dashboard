const IProductionOperationRepository = require("../../../../../domain/repositories/production/IProductionOperationRepository");
const ProductionOperation = require("../../models/ProductionOperation");

class MongoProductionOperationRepository extends IProductionOperationRepository {
  async findAll(query = {}) {
    return ProductionOperation.find(query).sort({ sequenceNo: 1 }).lean();
  }

  async find(query = {}) {
    return ProductionOperation.find(query);
  }

  async findById(id) {
    return ProductionOperation.findById(id);
  }

  async findOne(query = {}) {
    return ProductionOperation.findOne(query);
  }

  async findByProductionOrder(productionOrderId) {
    return ProductionOperation.find({ productionOrderId })
      .populate("assignedEmployeeId", "name email role")
      .populate("machineId", "printerName brand model")
      .sort({ sequenceNo: 1 })
      .lean();
  }

  async findByProductionOrders(productionOrderIds) {
    return ProductionOperation.find({
      productionOrderId: { $in: productionOrderIds },
    })
      .populate("assignedEmployeeId", "name email role")
      .populate("machineId", "printerName brand model")
      .sort({ sequenceNo: 1 })
      .lean();
  }

  async findPriorOperations(productionOrderId, sequenceNo) {
    return ProductionOperation.find({
      productionOrderId,
      sequenceNo: { $lt: sequenceNo },
    });
  }

  async create(data) {
    return ProductionOperation.create(data);
  }

  async insertMany(dataArray) {
    return ProductionOperation.insertMany(dataArray);
  }

  async update(id, updateData) {
    return ProductionOperation.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async updateMany(filter, updateData) {
    return ProductionOperation.updateMany(filter, updateData);
  }

  async findOneAndUpdate(filter, updateData, options = { new: true }) {
    return ProductionOperation.findOneAndUpdate(filter, updateData, options);
  }

  async countDocuments(filter = {}) {
    return ProductionOperation.countDocuments(filter);
  }
}

module.exports = new MongoProductionOperationRepository();
