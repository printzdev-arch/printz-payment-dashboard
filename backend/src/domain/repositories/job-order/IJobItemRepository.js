/**
 * IJobItemRepository Interface / Contract
 */
class IJobItemRepository {
  async findByJobOrderId(jobOrderId) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async insertMany(items) { throw new Error("Method not implemented"); }
  async deleteMany(filter) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
}

module.exports = IJobItemRepository;
