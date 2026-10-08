/**
 * IJobSampleRepository Interface / Contract
 */
class IJobSampleRepository {
  async find(query = {}) { throw new Error("Method not implemented"); }
  async findByJobOrderId(jobOrderId) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findOne(query = {}) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
  async countDocuments(filter = {}) { throw new Error("Method not implemented"); }
  async aggregate(pipeline) { throw new Error("Method not implemented"); }
}

module.exports = IJobSampleRepository;
