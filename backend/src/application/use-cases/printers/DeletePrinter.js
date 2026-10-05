const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeletePrinter {
  constructor({ printerRepository }) {
    this.printerRepository = printerRepository;
  }

  async execute(id) {
    const deleted = await this.printerRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Printer not found");
    }
    return { id, message: "Printer deleted successfully" };
  }
}

module.exports = DeletePrinter;
