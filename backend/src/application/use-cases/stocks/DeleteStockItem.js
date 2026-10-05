const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeleteStockItem {
  constructor({ stockRepository }) {
    this.stockRepository = stockRepository;
  }

  async execute(id) {
    const deleted = await this.stockRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Stock item not found");
    }
    return { id, message: "Stock item deleted successfully" };
  }
}

module.exports = DeleteStockItem;
