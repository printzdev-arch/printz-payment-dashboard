class GetAllPayments {
  constructor({ paymentRepository }) {
    this.paymentRepository = paymentRepository;
  }

  async execute(filters = {}) {
    return this.paymentRepository.findAll(filters);
  }
}

module.exports = GetAllPayments;
