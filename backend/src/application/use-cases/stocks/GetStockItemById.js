const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetStockItemById {
  constructor({ stockRepository }) {
    this.stockRepository = stockRepository;
  }

  async execute(id) {
    const item = await this.stockRepository.findById(id);
    if (!item) {
      throw ErrorHelper.notFound("Stock item not found");
    }
    return item;
  }
}

module.exports = GetStockItemById;
