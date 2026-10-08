/**
 * IDeliveryOrderRepository Interface / Contract
 */
class IDeliveryOrderRepository {
  async findAll(query = {}) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async upsert(filter, data) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
  async countDocuments(filter = {}) { throw new Error("Method not implemented"); }
}

module.exports = IDeliveryOrderRepository;
