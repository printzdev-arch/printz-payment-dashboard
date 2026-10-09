const mongoose = require("mongoose");
const IInventoryItemRepository = require("../../../../../domain/repositories/inventory/IInventoryItemRepository");
const InventoryItem = require("../../models/inventory/InventoryItem");

class InventoryItemRepository extends IInventoryItemRepository {
  async findAll(query = {}, { page = 1, limit = 50, sort = { itemCode: 1 } } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [records, total] = await Promise.all([
      InventoryItem.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .lean(),
      InventoryItem.countDocuments(query),
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return InventoryItem.findById(id).lean();
  }

  async findByItemCode(itemCode) {
    if (!itemCode) return null;
    return InventoryItem.findOne({ itemCode: String(itemCode).trim().toUpperCase() }).lean();
  }

  async create(data, session = null) {
    const item = new InventoryItem({
      ...data,
      itemCode: String(data.itemCode).trim().toUpperCase(),
    });
    return item.save({ session });
  }

  async update(id, data, session = null) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const { itemCode, ...allowedUpdates } = data; // itemCode is immutable
    return InventoryItem.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, session, runValidators: true }
    ).lean();
  }

  async setActive(id, isActive, session = null) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return InventoryItem.findByIdAndUpdate(
      id,
      { $set: { isActive: Boolean(isActive) } },
      { new: true, session }
    ).lean();
  }
}

module.exports = new InventoryItemRepository();
