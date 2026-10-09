/**
 * IProductOrderItemRepository Contract
 */
class IProductOrderItemRepository {
  async createMany(items, session = null) { throw new Error("Method not implemented"); }
  async findByOrderId(orderId, session = null) { throw new Error("Method not implemented"); }
  async deleteByOrderId(orderId, session = null) { throw new Error("Method not implemented"); }
  async updateItemQuantities(id, updateData, session = null) { throw new Error("Method not implemented"); }
}

module.exports = IProductOrderItemRepository;
