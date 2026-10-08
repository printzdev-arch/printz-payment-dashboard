const IJobItemRepository = require("../../../../../domain/repositories/job-order/IJobItemRepository");
const { JobItem } = require("../../models/job-order/JobItem");

class MongoJobItemRepository extends IJobItemRepository {
  async findByJobOrderId(jobOrderId) {
    return JobItem.find({ jobOrderId }).sort({ lineNo: 1 });
  }

  async findById(id) {
    return JobItem.findById(id);
  }

  async create(data) {
    return JobItem.create(data);
  }

  async insertMany(items) {
    return JobItem.insertMany(items);
  }

  async deleteMany(filter) {
    return JobItem.deleteMany(filter);
  }

  async update(id, updateData) {
    return JobItem.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }
}

module.exports = new MongoJobItemRepository();
