const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetStockReadingById {
  constructor({ stockReadingRepository }) {
    this.stockReadingRepository = stockReadingRepository;
  }

  async execute(id) {
    const reading = await this.stockReadingRepository.findById(id);
    if (!reading) {
      throw ErrorHelper.notFound("Stock reading not found");
    }
    return reading;
  }
}

module.exports = GetStockReadingById;
