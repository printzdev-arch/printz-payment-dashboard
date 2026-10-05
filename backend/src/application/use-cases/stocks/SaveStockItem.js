class SaveStockItem {
  constructor({ stockRepository }) {
    this.stockRepository = stockRepository;
  }

  async execute(itemData) {
    if (itemData && typeof itemData.validate === "function") {
      itemData.validate();
    }
    return this.stockRepository.save(itemData);
  }
}

module.exports = SaveStockItem;
