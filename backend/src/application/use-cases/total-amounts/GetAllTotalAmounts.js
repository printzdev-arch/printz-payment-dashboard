class GetAllTotalAmounts {
  constructor({ totalAmountReadingRepository }) {
    this.totalAmountReadingRepository = totalAmountReadingRepository;
  }

  async execute(filters = {}) {
    return this.totalAmountReadingRepository.findAll(filters);
  }
}

module.exports = GetAllTotalAmounts;
