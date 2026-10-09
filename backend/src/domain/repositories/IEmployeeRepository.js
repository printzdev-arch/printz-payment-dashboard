/**
 * IEmployeeRepository Interface / Contract
 */
class IEmployeeRepository {
  async findAll(filters, pagination) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByCode(code) { throw new Error("Method not implemented"); }
  async findByEmail(email) { throw new Error("Method not implemented"); }
  async createWithAssignment(employeeData, createdByUserId) { throw new Error("Method not implemented"); }
  async updateWithTransfer(id, updateData, modifiedByUserId) { throw new Error("Method not implemented"); }
  async deactivate(id, { reason, leftCompany }) { throw new Error("Method not implemented"); }
  async getBranchAssignments(employeeId) { throw new Error("Method not implemented"); }
}

module.exports = IEmployeeRepository;
