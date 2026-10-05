const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetPrinterReadingById {
  constructor({ printerReadingRepository }) {
    this.printerReadingRepository = printerReadingRepository;
  }

  async execute(id) {
    const reading = await this.printerReadingRepository.findById(id);
    if (!reading) {
      throw ErrorHelper.notFound("Printer reading not found");
    }
    return reading;
  }
}

module.exports = GetPrinterReadingById;
