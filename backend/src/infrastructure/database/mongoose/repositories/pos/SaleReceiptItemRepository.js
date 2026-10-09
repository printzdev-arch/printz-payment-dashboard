const SaleReceiptItem = require("../../models/pos/SaleReceiptItem");
const ISaleReceiptItemRepository = require("../../../../../domain/repositories/pos/ISaleReceiptItemRepository");

class SaleReceiptItemRepository extends ISaleReceiptItemRepository {
  async createMany(items, session = null) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const opts = session ? { session } : {};
    return SaleReceiptItem.insertMany(items, opts);
  }

  async findByReceiptId(receiptId, session = null) {
    const query = SaleReceiptItem.find({ receiptId }).lean();
    if (session) query.session(session);
    return query.exec();
  }

  async deleteByReceiptId(receiptId, session = null) {
    const opts = session ? { session } : {};
    return SaleReceiptItem.deleteMany({ receiptId }, opts).exec();
  }
}

module.exports = new SaleReceiptItemRepository();
