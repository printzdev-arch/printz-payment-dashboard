/**
 * IInventoryItemRepository Interface / Contract
 */
class IInventoryItemRepository {
  async findAll(query, options) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByItemCode(itemCode) { throw new Error("Method not implemented"); }
  async create(data, session) { throw new Error("Method not implemented"); }
  async update(id, data, session) { throw new Error("Method not implemented"); }
  async setActive(id, isActive, session) { throw new Error("Method not implemented"); }
}

module.exports = IInventoryItemRepository;
