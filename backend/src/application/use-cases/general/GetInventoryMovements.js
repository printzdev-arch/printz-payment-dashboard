/**
 * Get Inventory Movements Use Case
 */
class GetInventoryMovements {
  constructor({ inventoryMovementRepository }) {
    this.inventoryMovementRepository = inventoryMovementRepository;
  }

  async execute(filters = {}) {
    return this.inventoryMovementRepository.findAll(filters);
  }
}

module.exports = GetInventoryMovements;
