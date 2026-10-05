class GetStockReadings {
  constructor({ stockReadingRepository }) {
    this.stockReadingRepository = stockReadingRepository;
  }

  async execute(filters = {}) {
    return this.stockReadingRepository.findAll(filters);
  }
}

module.exports = GetStockReadings;
