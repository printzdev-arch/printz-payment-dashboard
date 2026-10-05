class CreatePrinter {
  constructor({ printerRepository }) {
    this.printerRepository = printerRepository;
  }

  async execute(printerData) {
    if (printerData && typeof printerData.validate === "function") {
      printerData.validate();
    }
    return this.printerRepository.create(printerData);
  }
}

module.exports = CreatePrinter;
