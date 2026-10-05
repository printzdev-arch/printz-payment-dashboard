const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdatePayment {
  constructor({ paymentRepository }) {
    this.paymentRepository = paymentRepository;
  }

  async execute(id, updateData) {
    if (updateData && typeof updateData.validate === "function") {
      updateData.validate();
    }

    const payment = await this.paymentRepository.update(id, updateData);
    if (!payment) {
      throw ErrorHelper.notFound("Payment record not found");
    }
    return payment;
  }
}

module.exports = UpdatePayment;
