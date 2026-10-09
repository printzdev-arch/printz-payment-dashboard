const SaleReceipt = require("../../models/pos/SaleReceipt");
const ISaleReceiptRepository = require("../../../../../domain/repositories/pos/ISaleReceiptRepository");

class SaleReceiptRepository extends ISaleReceiptRepository {
  async create(data, session = null) {
    const opts = session ? { session } : {};
    const [doc] = await SaleReceipt.create([data], opts);
    return doc;
  }

  async findById(id, session = null) {
    const query = SaleReceipt.findById(id);
    if (session) query.session(session);
    return query.exec();
  }

  async findByReceiptNo(receiptNo, session = null) {
    const query = SaleReceipt.findOne({ receiptNo });
    if (session) query.session(session);
    return query.exec();
  }

  async findByIdempotencyKey(idempotencyKey, session = null) {
    if (!idempotencyKey) return null;
    const query = SaleReceipt.findOne({ idempotencyKey });
    if (session) query.session(session);
    return query.exec();
  }

  async update(id, updateData, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return SaleReceipt.findByIdAndUpdate(id, { $set: updateData }, opts).exec();
  }

  async delete(id, session = null) {
    const opts = session ? { session } : {};
    return SaleReceipt.findByIdAndDelete(id, opts).exec();
  }

  async findAll(query = {}, pagination = {}) {
    const { page = 1, limit = 50, sort = { saleDate: -1 } } = pagination;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      SaleReceipt.find(query).sort(sort).skip(skip).limit(limit).lean().exec(),
      SaleReceipt.countDocuments(query).exec(),
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

module.exports = new SaleReceiptRepository();
