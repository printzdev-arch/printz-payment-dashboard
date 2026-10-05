/**
 * IJumboXeroxRepository Interface / Contract
 */
class IJumboXeroxRepository {
  async findAll(filters) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async create(machineData) { throw new Error("Method not implemented"); }
  async update(id, machineData) { throw new Error("Method not implemented"); }
  async save(machineData) { throw new Error("Method not implemented"); }
  async delete(id) { throw new Error("Method not implemented"); }
}

module.exports = IJumboXeroxRepository;
