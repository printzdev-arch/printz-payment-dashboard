const mongoose = require("mongoose");
const PaymentToBeCollected = require("../models/PaymentToBeCollected");
const ApiError = require("../../../utils/errors/ApiError");
const { runPaged, withoutPaging } = require("../../../utils/helpers/pagination");
const { isOutstandingRequest, buildOutstandingPipeline } = require("./paymentOutstanding.query");

// The /payments endpoints manage "payments to be collected" records (see PaymentDto), not invoice payments
const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const paymentRepository = {
  // The query string is used as the filter, so the paging keys must not reach the database filter
  findAll: (filters = {}) => {
    // Previous Balances screen: pending amounts only, with branch filter, search and paging done here
    if (isOutstandingRequest(filters)) {
      const pipeline = buildOutstandingPipeline(filters);
      return runPaged(
        () => PaymentToBeCollected.aggregate(pipeline).sort({ dateAt: -1, _id: -1 }),
        async () => {
          const [row] = await PaymentToBeCollected.aggregate([...pipeline, { $count: "total" }]);
          return row ? row.total : 0;
        },
        filters
      );
    }

    const filter = withoutPaging(filters);
    return runPaged(
      () => PaymentToBeCollected.find(filter).sort({ dateAt: -1 }).lean(),
      () => PaymentToBeCollected.countDocuments(filter),
      filters
    );
  },
  findById: (id) => (isId(id) ? PaymentToBeCollected.findById(id).lean() : null),
  create: (data) => PaymentToBeCollected.create({ ...data }),
  update: (id, data) =>
    isId(id) ? PaymentToBeCollected.findByIdAndUpdate(id, { $set: { ...data, updatedAt: new Date() } }, { new: true, runValidators: true }).lean() : null,
  delete: (id) => (isId(id) ? PaymentToBeCollected.findByIdAndDelete(id) : null),
};

class PaymentService {
  constructor(repo = paymentRepository) {
    this.repo = repo;
  }

  async getAllPayments(filters = {}) {
    return this.repo.findAll(filters);
  }

  async getPaymentById(id) {
    const payment = await this.repo.findById(id);
    if (!payment) {
      throw ApiError.notFound("Payment not found");
    }
    return payment;
  }

  async createPayment(paymentData) {
    if (paymentData && typeof paymentData.validate === "function") {
      paymentData.validate();
    }
    return this.repo.create(paymentData);
  }

  async updatePayment(id, paymentData) {
    if (paymentData && typeof paymentData.validate === "function") {
      paymentData.validate();
    }
    const payment = await this.repo.update(id, paymentData);
    if (!payment) {
      throw ApiError.notFound("Payment not found");
    }
    return payment;
  }

  async deletePayment(id) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw ApiError.notFound("Payment not found");
    }
    return { success: true };
  }
}

module.exports = new PaymentService();
