const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdatePrinter {
  constructor({ printerRepository }) {
    this.printerRepository = printerRepository;
  }

  async execute(id, printerData) {
    if (printerData && typeof printerData.validate === "function") {
      printerData.validate();
    }
    const updated = await this.printerRepository.update(id, printerData);
    if (!updated) {
      throw ErrorHelper.notFound("Printer not found");
    }
    return updated;
  }
}

module.exports = UpdatePrinter;
