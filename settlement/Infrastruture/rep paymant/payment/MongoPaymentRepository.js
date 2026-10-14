const Payment = require("../../models/payment/Payment");

class MongoPaymentRepository {
  async create(data) {
    return Payment.create(data);
  }

  async findById(id) {
    return Payment.findById(id)
      .populate("invoiceId")
      .populate("jobOrderId")
      .populate("collectedBy", "name email employeeCode")
      .populate("voidedBy", "name email employeeCode")
      .populate("branchId", "name code")
      .lean();
  }

  async findByInvoiceId(invoiceId) {
    return Payment.find({ invoiceId })
      .populate("collectedBy", "name email employeeCode")
      .sort({ createdAt: -1 })
      .lean();
  }

  async findValidPaymentsByInvoiceId(invoiceId) {
    return Payment.find({
      invoiceId,
      status: { $nin: ["VOID", "FAILED", "REVERSED"] },
    })
      .sort({ createdAt: 1 })
      .lean();
  }

  async findByJobOrderId(jobOrderId) {
    return Payment.find({ jobOrderId }).sort({ createdAt: -1 }).lean();
  }

  async findOne(query) {
    return Payment.findOne(query).lean();
  }

  async find(query, options = {}) {
    let q = Payment.find(query);
    if (options.sort) q = q.sort(options.sort);
    if (options.skip) q = q.skip(options.skip);
    if (options.limit) q = q.limit(options.limit);
    if (options.populate) {
      options.populate.forEach((pop) => {
        q = q.populate(pop);
      });
    }
    return q.lean();
  }

  async countDocuments(query) {
    return Payment.countDocuments(query);
  }

  async updateById(id, update) {
    return Payment.findByIdAndUpdate(id, update, { new: true });
  }
}

module.exports = new MongoPaymentRepository();
