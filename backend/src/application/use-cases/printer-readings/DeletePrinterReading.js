const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeletePrinterReading {
  constructor({ printerReadingRepository }) {
    this.printerReadingRepository = printerReadingRepository;
  }

  async execute(id) {
    const deleted = await this.printerReadingRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Printer reading not found");
    }
    return { id, message: "Printer reading deleted successfully" };
  }
}

module.exports = DeletePrinterReading;
