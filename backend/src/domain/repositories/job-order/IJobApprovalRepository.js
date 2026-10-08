/**
 * IJobApprovalRepository Interface / Contract
 */
class IJobApprovalRepository {
  async findByJobOrderId(jobOrderId, approvalType = null) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findOne(filter) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
  async updateMany(filter, updateData) { throw new Error("Method not implemented"); }
  async countDocuments(filter = {}) { throw new Error("Method not implemented"); }
}

module.exports = IJobApprovalRepository;
