const IJobSampleRepository = require("../../../../../domain/repositories/design/IJobSampleRepository");
const JobSample = require("../../models/design/JobSample");

class MongoJobSampleRepository extends IJobSampleRepository {
  async find(query = {}) {
    return JobSample.find(query)
      .populate("submittedBy", "name email role")
      .populate("approvedBy", "name email role")
      .sort({ versionNo: 1 });
  }

  async findByJobOrderId(jobOrderId) {
    return JobSample.find({ jobOrderId })
      .populate("submittedBy", "name email role")
      .populate("approvedBy", "name email role")
      .sort({ versionNo: 1 });
  }

  async findById(id) {
    return JobSample.findById(id)
      .populate("submittedBy", "name email role")
      .populate("approvedBy", "name email role");
  }

  async findOne(query = {}) {
    return JobSample.findOne(query)
      .populate("submittedBy", "name email role")
      .populate("approvedBy", "name email role");
  }

  async create(data) {
    return JobSample.create(data);
  }

  async update(id, updateData) {
    return JobSample.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async countDocuments(filter = {}) {
    return JobSample.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return JobSample.aggregate(pipeline);
  }
}

module.exports = new MongoJobSampleRepository();
