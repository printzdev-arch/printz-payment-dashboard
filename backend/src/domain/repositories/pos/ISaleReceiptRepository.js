/**
 * ISaleReceiptRepository Interface
 */
class ISaleReceiptRepository {
  async create(receiptData, session = null) {
    throw new Error("Method not implemented");
  }

  async findById(id, session = null) {
    throw new Error("Method not implemented");
  }

  async findByReceiptNo(receiptNo, session = null) {
    throw new Error("Method not implemented");
  }

  async findByIdempotencyKey(key, session = null) {
    throw new Error("Method not implemented");
  }

  async update(id, updateData, session = null) {
    throw new Error("Method not implemented");
  }

  async delete(id, session = null) {
    throw new Error("Method not implemented");
  }

  async findAll(query, pagination) {
    throw new Error("Method not implemented");
  }
}

module.exports = ISaleReceiptRepository;
