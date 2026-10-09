/**
 * IPurchaseReceiptRepository Interface / Contract
 */
class IPurchaseReceiptRepository {
  async findAll(query, options) { throw new Error("Method not implemented"); }
  async findById(id, session) { throw new Error("Method not implemented"); }
  async create(data, session) { throw new Error("Method not implemented"); }
  async update(id, data, session) { throw new Error("Method not implemented"); }
  async updateStatus(id, status, session) { throw new Error("Method not implemented"); }
}

module.exports = IPurchaseReceiptRepository;
