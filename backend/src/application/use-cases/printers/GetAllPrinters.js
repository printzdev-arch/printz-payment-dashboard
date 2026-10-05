const IPrinterRepository = require("../../../domain/repositories/IPrinterRepository");

class GetAllPrinters {
  /**
   * @param {Object} dependencies
   * @param {IPrinterRepository} dependencies.printerRepository
   */
  constructor({ printerRepository }) {
    /** @type {IPrinterRepository} */
    this.printerRepository = printerRepository;
  }

  async execute(filters = {}) {
    return this.printerRepository.findAll(filters);
  }
}

module.exports = GetAllPrinters;
