const mongoose = require("mongoose");
const StockTransfer = require("../../models/product-order/StockTransfer");
const IStockTransferRepository = require("../../../../../domain/repositories/product-order/IStockTransferRepository");

class StockTransferRepository extends IStockTransferRepository {
  async create(data, session = null) {
    const opts = session ? { session } : {};
    const [doc] = await StockTransfer.create([data], opts);
    return doc;
  }

  async findById(id, session = null) {
    if (!id) return null;
    const query = StockTransfer.findById(id)
      .populate("fromBranchId", "name code branchType")
      .populate("toBranchId", "name code branchType")
      .populate("productOrderId", "orderNo status")
      .populate("requestedBy", "name email username")
      .populate("approvedBy", "name email username")
      .populate("dispatchedBy", "name email username")
      .populate("receivedBy", "name email username")
      .populate("items.itemId", "itemCode name unit category");
    if (session) query.session(session);
    return query.exec();
  }

  async findByTransferNo(transferNo, session = null) {
    if (!transferNo) return null;
    const query = StockTransfer.findOne({ transferNo });
    if (session) query.session(session);
    return query.exec();
  }

  async findByProductOrderId(productOrderId, session = null) {
    if (!productOrderId) return null;
    const query = StockTransfer.findOne({ productOrderId })
      .populate("fromBranchId", "name code branchType")
      .populate("toBranchId", "name code branchType")
      .populate("items.itemId", "itemCode name unit category");
    if (session) query.session(session);
    return query.exec();
  }

  async update(id, updateData, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return StockTransfer.findByIdAndUpdate(id, { $set: updateData }, opts).exec();
  }

  async findAll(query = {}, pagination = {}) {
    const { page = 1, limit = 50, sort = { createdAt: -1 } } = pagination;
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

    const [records, total] = await Promise.all([
      StockTransfer.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("fromBranchId", "name code branchType")
        .populate("toBranchId", "name code branchType")
        .populate("productOrderId", "orderNo status")
        .populate("requestedBy", "name email username")
        .populate("approvedBy", "name email username")
        .populate("dispatchedBy", "name email username")
        .populate("receivedBy", "name email username")
        .populate("items.itemId", "itemCode name unit category")
        .lean()
        .exec(),
      StockTransfer.countDocuments(query).exec(),
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

module.exports = new StockTransferRepository();
