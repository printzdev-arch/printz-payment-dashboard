class GetAllPrinterReadings {
  constructor({ printerReadingRepository }) {
    this.printerReadingRepository = printerReadingRepository;
  }

  async execute(filters = {}) {
    return this.printerReadingRepository.findAll(filters);
  }
}

module.exports = GetAllPrinterReadings;
