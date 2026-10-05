class SaveStockReading {
  constructor({ stockReadingRepository }) {
    this.stockReadingRepository = stockReadingRepository;
  }

  async execute(readingData) {
    if (readingData && typeof readingData.validate === "function") {
      readingData.validate();
    }
    return this.stockReadingRepository.save(readingData);
  }
}

module.exports = SaveStockReading;
