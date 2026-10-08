/**
 * IJobWorkflowEventRepository Interface / Contract
 */
class IJobWorkflowEventRepository {
  async findByJobOrderId(jobOrderId) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async findOne(filter) { throw new Error("Method not implemented"); }
}

module.exports = IJobWorkflowEventRepository;
