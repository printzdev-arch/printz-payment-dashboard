class CreateInventoryMovement {
  constructor({ inventoryMovementRepository }) {
    this.inventoryMovementRepository = inventoryMovementRepository;
  }

  async execute(data) {
    return this.inventoryMovementRepository.create(data);
  }
}

module.exports = CreateInventoryMovement;
