const mongoose = require("mongoose");
const IInventoryTransactionRepository = require("../../../../../domain/repositories/inventory/IInventoryTransactionRepository");
const InventoryTransaction = require("../../models/inventory/InventoryTransaction");

class InventoryTransactionRepository extends IInventoryTransactionRepository {
  async create(data, session = null) {
    const txn = new InventoryTransaction(data);
    return txn.save({ session });
  }

  async findAll(query = {}, { page = 1, limit = 50, sort = { transactionDate: -1, createdAt: -1 } } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [records, total] = await Promise.all([
      InventoryTransaction.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("itemId", "itemCode name unit category")
        .populate("branchId", "name code")
        .populate("performedBy", "name email username")
        .lean(),
      InventoryTransaction.countDocuments(query),
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
    return InventoryTransaction.findById(id)
      .populate("itemId", "itemCode name unit category purchaseRate saleRate")
      .populate("branchId", "name code")
      .populate("performedBy", "name email username")
      .lean();
  }

  async findByReference(referenceType, referenceId, session = null) {
    if (!referenceType || !referenceId) return [];
    const query = InventoryTransaction.find({
      referenceType: String(referenceType).toUpperCase(),
      referenceId,
    })
      .populate("itemId", "itemCode name unit category")
      .sort({ transactionDate: -1, createdAt: -1 });
    if (session) query.session(session);
    return query.lean().exec();
  }
}

module.exports = new InventoryTransactionRepository();
