/**
 * IProductionOperationRepository Interface / Contract
 */
class IProductionOperationRepository {
  async findAll(query = {}) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findOne(query = {}) { throw new Error("Method not implemented"); }
  async findByProductionOrder(productionOrderId) { throw new Error("Method not implemented"); }
  async findByProductionOrders(productionOrderIds) { throw new Error("Method not implemented"); }
  async findPriorOperations(productionOrderId, sequenceNo) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async insertMany(dataArray) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
  async updateMany(filter, updateData) { throw new Error("Method not implemented"); }
  async findOneAndUpdate(filter, updateData) { throw new Error("Method not implemented"); }
  async countDocuments(filter = {}) { throw new Error("Method not implemented"); }
}

module.exports = IProductionOperationRepository;
