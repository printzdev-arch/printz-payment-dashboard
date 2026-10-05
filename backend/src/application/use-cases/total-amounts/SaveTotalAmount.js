class SaveTotalAmount {
  constructor({ totalAmountReadingRepository }) {
    this.totalAmountReadingRepository = totalAmountReadingRepository;
  }

  async execute(readingData) {
    if (readingData && typeof readingData.validate === "function") {
      readingData.validate();
    }
    return this.totalAmountReadingRepository.save(readingData);
  }
}

module.exports = SaveTotalAmount;
