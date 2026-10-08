const IJobOrderRepository = require("../../../../../domain/repositories/production/IJobOrderRepository");
const JobOrder = require("../../models/JobOrder");

class MongoJobOrderRepository extends IJobOrderRepository {
  async findById(id) {
    return JobOrder.findById(id);
  }

  async findOne(query = {}) {
    return JobOrder.findOne(query);
  }

  async updateStage(jobOrderId, newStage, newStatus = null) {
    if (!jobOrderId) return null;
    const update = { stage: newStage };
    if (newStatus) update.status = newStatus;
    return JobOrder.findByIdAndUpdate(jobOrderId, { $set: update }, { new: true });
  }

  async update(id, updateData) {
    return JobOrder.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }
}

module.exports = new MongoJobOrderRepository();
