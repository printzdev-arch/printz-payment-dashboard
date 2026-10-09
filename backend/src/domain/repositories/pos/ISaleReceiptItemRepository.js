/**
 * ISaleReceiptItemRepository Interface
 */
class ISaleReceiptItemRepository {
  async createMany(items, session = null) {
    throw new Error("Method not implemented");
  }

  async findByReceiptId(receiptId, session = null) {
    throw new Error("Method not implemented");
  }

  async deleteByReceiptId(receiptId, session = null) {
    throw new Error("Method not implemented");
  }
}

module.exports = ISaleReceiptItemRepository;
