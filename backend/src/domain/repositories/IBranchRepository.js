/**
 * IBranchRepository Interface / Contract
 */
class IBranchRepository {
  async findAll(filters) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByName(name) { throw new Error("Method not implemented"); }
  async findByCode(code) { throw new Error("Method not implemented"); }
  async create(branchData) { throw new Error("Method not implemented"); }
  async update(id, branchData) { throw new Error("Method not implemented"); }
  async delete(id) { throw new Error("Method not implemented"); }
}

module.exports = IBranchRepository;
