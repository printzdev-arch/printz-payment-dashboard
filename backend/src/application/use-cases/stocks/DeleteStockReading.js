const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeleteStockReading {
  constructor({ stockReadingRepository }) {
    this.stockReadingRepository = stockReadingRepository;
  }

  async execute(id) {
    const deleted = await this.stockReadingRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Stock reading not found");
    }
    return { id, message: "Stock reading deleted successfully" };
  }
}

module.exports = DeleteStockReading;
