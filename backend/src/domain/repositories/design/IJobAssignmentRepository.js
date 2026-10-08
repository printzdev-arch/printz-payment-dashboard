/**
 * IJobAssignmentRepository Interface / Contract
 */
class IJobAssignmentRepository {
  async find(query = {}) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findOne(query = {}) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
  async updateMany(filter, updateData) { throw new Error("Method not implemented"); }
  async aggregate(pipeline) { throw new Error("Method not implemented"); }
}

module.exports = IJobAssignmentRepository;
