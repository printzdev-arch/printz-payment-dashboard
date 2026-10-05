const IInventoryMovementRepository = require("../../../../domain/repositories/IInventoryMovementRepository");
const InventoryMovement = require("../models/InventoryMovement");

class MongoInventoryMovementRepository extends IInventoryMovementRepository {
  async findAll(filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.action) query.action = filters.action;
    if (filters.date) {
      const dateStr = String(filters.date).trim();
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      if (!isNaN(startOfDay.getTime())) {
        query.$or = [
          { movementDate: { $gte: startOfDay, $lte: endOfDay } },
          { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        ];
      }
    }
    return InventoryMovement.find(query).sort({ movementDate: -1, createdAt: -1 });
  }

  async findById(id) {
    return InventoryMovement.findById(id);
  }

  async create(data) {
    const movement = new InventoryMovement(data);
    await movement.save();
    return movement;
  }
}

module.exports = new MongoInventoryMovementRepository();
