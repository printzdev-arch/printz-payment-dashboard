const mongoose = require("mongoose");
const IStockRepository = require("../../../../domain/repositories/IStockRepository");
const StockItem = require("../models/StockItem");
const Branch = require("../models/Branch");

class MongoStockRepository extends IStockRepository {
  async _resolveBranch(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const branch = await Branch.findById(trimmed).lean();
      if (branch) return branch;
    }
    return Branch.findOne({
      $or: [
        { name: new RegExp(`^${trimmed}$`, "i") },
        { code: new RegExp(`^${trimmed}$`, "i") },
      ],
    }).lean();
  }

  async findAll(filters = {}) {
    const query = {};
    const branchIdentifier = filters.branchId || filters.branchName || filters.branch;
    if (branchIdentifier) {
      const branch = await this._resolveBranch(branchIdentifier);
      if (branch) {
        query.$or = [
          { branchId: branch._id },
          { branchId: branch._id.toString() },
          { branchName: new RegExp(`^${branch.name}$`, "i") },
        ];
      } else {
        query.$or = [
          { branchId: branchIdentifier },
          { branchName: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
      }
    }

    if (filters.category) query.category = new RegExp(`^${filters.category}$`, "i");
    if (filters.status) query.status = filters.status;

    return StockItem.find(query).sort({ itemName: 1 });
  }

  async findById(id) {
    if (!id) return null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      const item = await StockItem.findById(id);
      if (item) return item;
    }
    return StockItem.findOne({
      $or: [{ _id: id }, { stockId: id }, { legacyFirestoreId: id }],
    });
  }

  async save(data) {
    let item = null;
    const targetId = data._id || data.id;
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      item = await StockItem.findById(targetId).catch(() => null);
    }
    if (!item && data.stockId && data.branchId) {
      item = await StockItem.findOne({ stockId: data.stockId, branchId: data.branchId });
    }

    const payload = data.toJSON ? data.toJSON() : { ...data };
    delete payload.id;
    if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
      payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
    }

    if (item) {
      Object.assign(item, payload);
      await item.save();
      return { item, isNew: false };
    }

    const newItem = new StockItem(payload);
    await newItem.save();
    return { item: newItem, isNew: true };
  }

  async update(id, updateData) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const payload = updateData.toJSON ? updateData.toJSON() : { ...updateData };
    delete payload.id;
    if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
      payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
    }

    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  async delete(id) {
    const item = await this.findById(id);
    if (!item) return null;
    await StockItem.findByIdAndDelete(item._id);
    return item;
  }
}

module.exports = new MongoStockRepository();
