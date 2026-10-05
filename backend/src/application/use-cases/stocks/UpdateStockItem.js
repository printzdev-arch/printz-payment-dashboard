const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdateStockItem {
  constructor({ stockRepository }) {
    this.stockRepository = stockRepository;
  }

  async execute(id, updateData) {
    if (updateData && typeof updateData.validate === "function") {
      updateData.validate();
    }
    const item = await this.stockRepository.update(id, updateData);
    if (!item) {
      throw ErrorHelper.notFound("Stock item not found");
    }
    return item;
  }
}

module.exports = UpdateStockItem;
