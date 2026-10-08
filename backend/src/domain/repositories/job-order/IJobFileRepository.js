/**
 * IJobFileRepository Interface / Contract
 */
class IJobFileRepository {
  async findByJobOrderId(jobOrderId, fileCategory = null) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findOne(filter) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async countDocuments(filter = {}) { throw new Error("Method not implemented"); }
}

module.exports = IJobFileRepository;
