const mongoose = require("mongoose");
const IPurchaseReceiptRepository = require("../../../../../domain/repositories/inventory/IPurchaseReceiptRepository");
const PurchaseReceipt = require("../../models/inventory/PurchaseReceipt");

class PurchaseReceiptRepository extends IPurchaseReceiptRepository {
  async findAll(query = {}, { page = 1, limit = 50, sort = { receivedDate: -1, createdAt: -1 } } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [records, total] = await Promise.all([
      PurchaseReceipt.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("branchId", "name code")
        .populate("createdBy", "name email username")
        .populate("items.itemId", "itemCode name unit category")
        .lean(),
      PurchaseReceipt.countDocuments(query),
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id, session = null) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const query = PurchaseReceipt.findById(id)
      .populate("branchId", "name code")
      .populate("createdBy", "name email username")
      .populate("items.itemId", "itemCode name unit category");
    if (session) query.session(session);
    return query.lean();
  }

  async create(data, session = null) {
    const receipt = new PurchaseReceipt(data);
    return receipt.save({ session });
  }

  async update(id, data, session = null) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return PurchaseReceipt.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, session, runValidators: true }
    )
      .populate("branchId", "name code")
      .populate("createdBy", "name email username")
      .populate("items.itemId", "itemCode name unit category")
      .lean();
  }

  async updateStatus(id, status, session = null) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return PurchaseReceipt.findByIdAndUpdate(
      id,
      { $set: { status, updatedAt: new Date() } },
      { new: true, session }
    )
      .populate("branchId", "name code")
      .populate("createdBy", "name email username")
      .populate("items.itemId", "itemCode name unit category")
      .lean();
  }
}

module.exports = new PurchaseReceiptRepository();
