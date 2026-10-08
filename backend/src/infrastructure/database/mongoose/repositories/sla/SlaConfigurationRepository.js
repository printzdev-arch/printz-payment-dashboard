const ISlaConfigurationRepository = require("../../../../../domain/repositories/sla/ISlaConfigurationRepository");
const SlaConfiguration = require("../../models/sla/SlaConfiguration");

class SlaConfigurationRepository extends ISlaConfigurationRepository {
  async find(query = {}) {
    return SlaConfiguration.find(query).sort({ stage: 1, jobType: 1, priority: 1 });
  }

  async findById(id) {
    return SlaConfiguration.findById(id);
  }

  async findOne(query = {}) {
    return SlaConfiguration.findOne(query);
  }

  async create(data) {
    return SlaConfiguration.create(data);
  }

  async update(id, updateData) {
    return SlaConfiguration.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async deactivate(id) {
    return SlaConfiguration.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );
  }

  async countDocuments(query = {}) {
    return SlaConfiguration.countDocuments(query);
  }
}

module.exports = new SlaConfigurationRepository();
