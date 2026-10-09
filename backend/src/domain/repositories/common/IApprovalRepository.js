/**
 * IApprovalRepository Interface / Contract
 */
class IApprovalRepository {
  async create(data) { throw new Error("Method not implemented"); }
  async findAll(query, options) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByReference(referenceType, referenceId) { throw new Error("Method not implemented"); }
  async updateStatus(id, { status, approverId, decidedAt, comments }) { throw new Error("Method not implemented"); }
  async getCounts(query) { throw new Error("Method not implemented"); }
}

module.exports = IApprovalRepository;
