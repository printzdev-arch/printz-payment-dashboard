const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdatePrinterReading {
  constructor({ printerReadingRepository }) {
    this.printerReadingRepository = printerReadingRepository;
  }

  async execute(id, updateData) {
    const updated = await this.printerReadingRepository.update(id, updateData);
    if (!updated) {
      throw ErrorHelper.notFound("Printer reading not found");
    }
    return updated;
  }
}

module.exports = UpdatePrinterReading;
