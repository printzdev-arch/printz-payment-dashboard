const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdateStockReading {
  constructor({ stockReadingRepository }) {
    this.stockReadingRepository = stockReadingRepository;
  }

  async execute(id, updateData) {
    if (updateData && typeof updateData.validate === "function") {
      updateData.validate();
    }
    const reading = await this.stockReadingRepository.update(id, updateData);
    if (!reading) {
      throw ErrorHelper.notFound("Stock reading not found");
    }
    return reading;
  }
}

module.exports = UpdateStockReading;
