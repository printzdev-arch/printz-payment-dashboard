/**
 * ISlaConfigurationRepository Interface / Contract
 */
class ISlaConfigurationRepository {
  async find(query = {}) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findOne(query = {}) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
  async deactivate(id) { throw new Error("Method not implemented"); }
  async countDocuments(query = {}) { throw new Error("Method not implemented"); }
}

module.exports = ISlaConfigurationRepository;
