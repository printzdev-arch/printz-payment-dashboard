class CreatePayment {
  constructor({ paymentRepository }) {
    this.paymentRepository = paymentRepository;
  }

  async execute(paymentData) {
    if (paymentData && typeof paymentData.validate === "function") {
      paymentData.validate();
    }
    return this.paymentRepository.create(paymentData);
  }
}

module.exports = CreatePayment;
