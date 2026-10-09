/**
 * IProductOrderRepository Contract
 */
class IProductOrderRepository {
  async create(orderData, session = null) { throw new Error("Method not implemented"); }
  async findById(id, session = null) { throw new Error("Method not implemented"); }
  async findByOrderNo(orderNo, session = null) { throw new Error("Method not implemented"); }
  async update(id, updateData, session = null) { throw new Error("Method not implemented"); }
  async delete(id, session = null) { throw new Error("Method not implemented"); }
  async findAll(query, pagination) { throw new Error("Method not implemented"); }
}

module.exports = IProductOrderRepository;
