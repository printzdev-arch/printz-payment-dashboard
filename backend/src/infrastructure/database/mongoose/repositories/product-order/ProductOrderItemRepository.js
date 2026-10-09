const ProductOrderItem = require("../../models/product-order/ProductOrderItem");
const IProductOrderItemRepository = require("../../../../../domain/repositories/product-order/IProductOrderItemRepository");

class ProductOrderItemRepository extends IProductOrderItemRepository {
  async createMany(items, session = null) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const opts = session ? { session } : {};
    return ProductOrderItem.insertMany(items, opts);
  }

  async findByOrderId(orderId, session = null) {
    const query = ProductOrderItem.find({ orderId })
      .populate("itemId", "itemCode name unit category isStockTracked purchaseRate saleRate")
      .lean();
    if (session) query.session(session);
    return query.exec();
  }

  async deleteByOrderId(orderId, session = null) {
    const opts = session ? { session } : {};
    return ProductOrderItem.deleteMany({ orderId }, opts).exec();
  }

  async updateItemQuantities(id, updateData, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return ProductOrderItem.findByIdAndUpdate(id, { $set: updateData }, opts).exec();
  }
}

module.exports = new ProductOrderItemRepository();
