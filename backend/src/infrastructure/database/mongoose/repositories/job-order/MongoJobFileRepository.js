const IJobFileRepository = require("../../../../../domain/repositories/job-order/IJobFileRepository");
const JobFile = require("../../models/job-order/JobFile");

class MongoJobFileRepository extends IJobFileRepository {
  async findByJobOrderId(jobOrderId, fileCategory = null) {
    const filter = { jobOrderId };
    if (fileCategory) filter.fileCategory = fileCategory;
    return JobFile.find(filter)
      .populate("uploadedBy", "name email role")
      .sort({ uploadedAt: -1 });
  }

  async findById(id) {
    return JobFile.findById(id).populate("uploadedBy", "name email role");
  }

  async findOne(filter) {
    return JobFile.findOne(filter);
  }

  async create(data) {
    return JobFile.create(data);
  }

  async countDocuments(filter = {}) {
    return JobFile.countDocuments(filter);
  }
}

module.exports = new MongoJobFileRepository();
