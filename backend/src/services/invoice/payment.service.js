const paymentRepository = require("../../models/invoice/Payment");
const ApiError = require("../../utils/ApiError");

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
