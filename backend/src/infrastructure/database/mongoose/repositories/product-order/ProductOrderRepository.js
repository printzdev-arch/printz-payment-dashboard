const mongoose = require("mongoose");
const ProductOrder = require("../../models/product-order/ProductOrder");
const IProductOrderRepository = require("../../../../../domain/repositories/product-order/IProductOrderRepository");

class ProductOrderRepository extends IProductOrderRepository {
  async create(data, session = null) {
    const opts = session ? { session } : {};
    const [doc] = await ProductOrder.create([data], opts);
    return doc;
  }

  async findById(id, session = null) {
    if (!id) return null;
    const query = ProductOrder.findById(id)
      .populate("requestingBranchId", "name code branchType")
      .populate("requestedBy", "name email username")
      .populate("approvedBy", "name email username")
      .populate("dispatchedBy", "name email username")
      .populate("receivedBy", "name email username");
    if (session) query.session(session);
    return query.exec();
  }

  async findByOrderNo(orderNo, session = null) {
    if (!orderNo) return null;
    const query = ProductOrder.findOne({ orderNo });
    if (session) query.session(session);
    return query.exec();
  }

  async update(id, updateData, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return ProductOrder.findByIdAndUpdate(id, { $set: updateData }, opts).exec();
  }

  async delete(id, session = null) {
    const opts = session ? { session } : {};
    return ProductOrder.findByIdAndDelete(id, opts).exec();
  }

  async findAll(query = {}, pagination = {}) {
    const { page = 1, limit = 50, sort = { createdAt: -1 } } = pagination;
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

    const [records, total] = await Promise.all([
      ProductOrder.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("requestingBranchId", "name code branchType")
        .populate("requestedBy", "name email username")
        .populate("approvedBy", "name email username")
        .populate("dispatchedBy", "name email username")
        .populate("receivedBy", "name email username")
        .lean()
        .exec(),
      ProductOrder.countDocuments(query).exec(),
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

module.exports = new ProductOrderRepository();
