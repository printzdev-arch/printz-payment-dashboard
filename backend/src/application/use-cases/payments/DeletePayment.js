const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeletePayment {
  constructor({ paymentRepository }) {
    this.paymentRepository = paymentRepository;
  }

  async execute(id) {
    const deleted = await this.paymentRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Payment record not found");
    }
    return { id, message: "Payment record deleted successfully" };
  }
}

module.exports = DeletePayment;
