/**
 * IRoleRepository Interface / Contract
 */
class IRoleRepository {
  async findAll() { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByCode(code) { throw new Error("Method not implemented"); }
  async findByIds(ids) { throw new Error("Method not implemented"); }
  async create(roleData) { throw new Error("Method not implemented"); }
  async update(id, roleData) { throw new Error("Method not implemented"); }
  async delete(id) { throw new Error("Method not implemented"); }
}

module.exports = IRoleRepository;
