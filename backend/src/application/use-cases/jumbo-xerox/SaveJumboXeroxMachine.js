const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class SaveJumboXeroxMachine {
  constructor(jumboRepoOrOptions, branchRepository) {
    if (jumboRepoOrOptions && jumboRepoOrOptions.jumboXeroxRepository) {
      this.jumboXeroxRepository = jumboRepoOrOptions.jumboXeroxRepository;
      this.branchRepository = jumboRepoOrOptions.branchRepository || branchRepository;
    } else {
      this.jumboXeroxRepository = jumboRepoOrOptions;
      this.branchRepository = branchRepository;
    }
  }

  async execute(machineData = {}) {
    const { branchId, printerId, printerName, size, type, unitPrice } = machineData;

    if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
      throw ErrorHelper.badRequest("Invalid branch ID format.");
    }

    if (this.branchRepository) {
      const branch = await this.branchRepository.findById(branchId);
      if (!branch) {
        throw ErrorHelper.notFound("Branch not found.");
      }
    }

    if (!printerId || !String(printerId).trim()) {
      throw ErrorHelper.badRequest("Printer ID is required.");
    }

    if (!printerName || !String(printerName).trim()) {
      throw ErrorHelper.badRequest("Printer name is required.");
    }

    if (!size || !String(size).trim()) {
      throw ErrorHelper.badRequest("Size is required.");
    }

    if (!type || !String(type).trim()) {
      throw ErrorHelper.badRequest("Type is required.");
    }

    const price = Number(unitPrice);
    if (isNaN(price) || price < 0) {
      throw ErrorHelper.badRequest("Unit price must be greater than or equal to 0.");
    }

    return this.jumboXeroxRepository.create(machineData);
  }
}

module.exports = SaveJumboXeroxMachine;
