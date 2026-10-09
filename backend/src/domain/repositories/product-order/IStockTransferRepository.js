/**
 * IStockTransferRepository Contract
 */
class IStockTransferRepository {
  async create(transferData, session = null) { throw new Error("Method not implemented"); }
  async findById(id, session = null) { throw new Error("Method not implemented"); }
  async findByTransferNo(transferNo, session = null) { throw new Error("Method not implemented"); }
  async findByProductOrderId(productOrderId, session = null) { throw new Error("Method not implemented"); }
  async update(id, updateData, session = null) { throw new Error("Method not implemented"); }
  async findAll(query, pagination) { throw new Error("Method not implemented"); }
}

module.exports = IStockTransferRepository;
