const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetPaymentById {
  constructor({ paymentRepository }) {
    this.paymentRepository = paymentRepository;
  }

  async execute(id) {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw ErrorHelper.notFound("Payment record not found");
    }
    return payment;
  }
}

module.exports = GetPaymentById;
