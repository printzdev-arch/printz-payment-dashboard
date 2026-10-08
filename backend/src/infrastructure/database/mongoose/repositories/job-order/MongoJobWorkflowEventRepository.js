const IJobWorkflowEventRepository = require("../../../../../domain/repositories/job-order/IJobWorkflowEventRepository");
const JobWorkflowEvent = require("../../models/job-order/JobWorkflowEvent");

class MongoJobWorkflowEventRepository extends IJobWorkflowEventRepository {
  async findByJobOrderId(jobOrderId) {
    return JobWorkflowEvent.find({ jobOrderId })
      .populate("actorId", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: 1 });
  }

  async create(data) {
    return JobWorkflowEvent.create(data);
  }

  async findOne(filter) {
    return JobWorkflowEvent.findOne(filter);
  }
}

module.exports = new MongoJobWorkflowEventRepository();
