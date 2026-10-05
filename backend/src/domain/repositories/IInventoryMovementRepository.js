/**
 * IInventoryMovementRepository Interface / Contract
 */
class IInventoryMovementRepository {
  async findAll(filters) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async create(movementData) { throw new Error("Method not implemented"); }
}

module.exports = IInventoryMovementRepository;
