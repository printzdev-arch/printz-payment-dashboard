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
        const branchConds = [
          { branchId: branchIdentifier },
          { branchName: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
        if (mongoose.Types.ObjectId.isValid(branchIdentifier)) {
          branchConds.push({ branchId: new mongoose.Types.ObjectId(branchIdentifier) });
        }
        query.$or = branchConds;
      }
    }

    if (filters.stockId) {
      const escaped = String(filters.stockId).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.stockId = new RegExp(`^${escaped}$`, "i");
    }
    if (filters.itemName) {
      const escaped = String(filters.itemName).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.itemName = new RegExp(`^${escaped}$`, "i");
    }
    if (filters.category) {
      const escaped = String(filters.category).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.category = new RegExp(`^${escaped}$`, "i");
    }
    if (filters.status) query.status = filters.status;

    return StockItem.find(query).sort({ itemName: 1 });
  }

  async findById(id) {
    if (!id) return null;
    const trimmed = String(id).trim();
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const item = await StockItem.findById(trimmed);
      if (item) return item;
    }
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return StockItem.findOne({
      $or: [
        { _id: trimmed },
        { stockId: new RegExp(`^${escaped}$`, "i") },
        { legacyFirestoreId: trimmed },
      ],
    });
  }

  async save(data) {
    let item = null;
    const targetId = data._id || data.id;
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      item = await StockItem.findById(targetId).catch(() => null);
    }

    const payload = data.toJSON ? data.toJSON() : { ...data };
    delete payload.id;

    // Resolve branch details
    if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
      payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
    }
    if (!payload.branchId && payload.branchName) {
      const branch = await this._resolveBranch(payload.branchName);
      if (branch) payload.branchId = branch._id;
    }
    if (payload.branchId && !payload.branchName) {
      const branch = await this._resolveBranch(payload.branchId);
      if (branch) payload.branchName = branch.name;
    }

    if (!item && data.stockId) {
      const stockEscaped = String(data.stockId).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const branchConds = [];
      if (payload.branchId) {
        branchConds.push({ branchId: payload.branchId });
        branchConds.push({ branchId: payload.branchId.toString() });
      }
      if (payload.branchName) {
        branchConds.push({ branchName: new RegExp(`^${payload.branchName}$`, "i") });
      }
      if (branchConds.length > 0) {
        item = await StockItem.findOne({
          stockId: new RegExp(`^${stockEscaped}$`, "i"),
          $or: branchConds,
        });
      }
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
