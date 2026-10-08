/**
 * IJobOrderRepository Interface / Contract
 */
class IJobOrderRepository {
  async findById(id) { throw new Error("Method not implemented"); }
  async updateStage(jobOrderId, newStage, newStatus = null) { throw new Error("Method not implemented"); }
}

module.exports = IJobOrderRepository;
