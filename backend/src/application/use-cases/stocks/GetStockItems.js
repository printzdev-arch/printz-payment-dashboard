class GetStockItems {
  constructor({ stockRepository }) {
    this.stockRepository = stockRepository;
  }

  async execute(filters = {}) {
    return this.stockRepository.findAll(filters);
  }
}

module.exports = GetStockItems;
