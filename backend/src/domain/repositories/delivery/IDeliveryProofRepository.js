/**
 * IDeliveryProofRepository Interface / Contract
 */
class IDeliveryProofRepository {
  async findAll(query = {}) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByDeliveryOrderId(deliveryOrderId) { throw new Error("Method not implemented"); }
  async findByJobOrderId(jobOrderId) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
  async countDocuments(filter = {}) { throw new Error("Method not implemented"); }
}

module.exports = IDeliveryProofRepository;
