class SavePrinterReading {
  constructor({ printerReadingRepository }) {
    this.printerReadingRepository = printerReadingRepository;
  }

  async execute(readingData) {
    const result = await this.printerReadingRepository.save(readingData);
    return result;
  }
}

module.exports = SavePrinterReading;
