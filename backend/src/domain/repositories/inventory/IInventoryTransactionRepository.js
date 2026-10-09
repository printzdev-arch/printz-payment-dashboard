/**
 * IInventoryTransactionRepository Interface / Contract
 */
class IInventoryTransactionRepository {
  async create(data, session) { throw new Error("Method not implemented"); }
  async findAll(query, options) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByReference(referenceType, referenceId, session) { throw new Error("Method not implemented"); }
}

module.exports = IInventoryTransactionRepository;
