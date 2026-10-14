const IJobApprovalRepository = require("../../../../../domain/repositories/job-order/IJobApprovalRepository");
const JobApproval = require("../../models/job-order/JobApproval");

class MongoJobApprovalRepository extends IJobApprovalRepository {
  async findByJobOrderId(jobOrderId, approvalType = null) {
    const filter = { jobOrderId };
    if (approvalType) filter.approvalType = approvalType;
    return JobApproval.find(filter)
      .populate("requestedBy", "name email role")
      .populate("decisionBy", "name email role")
      .sort({ createdAt: 1 });
  }

  async findById(id) {
    return JobApproval.findById(id);
  }

  async findOne(filter, options = {}) {
    let q = JobApproval.findOne(filter);
    if (options.sort) q = q.sort(options.sort);
    return q;
  }

  async create(data) {
    return JobApproval.create(data);
  }

  async update(id, updateData) {
    return JobApproval.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async updateMany(filter, updateData) {
    return JobApproval.updateMany(filter, { $set: updateData });
  }

  async countDocuments(filter = {}) {
    return JobApproval.countDocuments(filter);
  }
}

module.exports = new MongoJobApprovalRepository();
