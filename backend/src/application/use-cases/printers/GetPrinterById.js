const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetPrinterById {
  constructor({ printerRepository }) {
    this.printerRepository = printerRepository;
  }

  async execute(id) {
    const printer = await this.printerRepository.findById(id);
    if (!printer) {
      throw ErrorHelper.notFound("Printer not found");
    }
    return printer;
  }
}

module.exports = GetPrinterById;
