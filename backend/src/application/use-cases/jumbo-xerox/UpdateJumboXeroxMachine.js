const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdateJumboXeroxMachine {
  constructor(jumboRepoOrOptions, branchRepository) {
    if (jumboRepoOrOptions && jumboRepoOrOptions.jumboXeroxRepository) {
      this.jumboXeroxRepository = jumboRepoOrOptions.jumboXeroxRepository;
      this.branchRepository = jumboRepoOrOptions.branchRepository || branchRepository;
    } else {
      this.jumboXeroxRepository = jumboRepoOrOptions;
      this.branchRepository = branchRepository;
    }
  }

  async execute(id, updateData = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid machine ID format.");
    }

    const existing = await this.jumboXeroxRepository.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Jumbo Xerox machine not found.");
    }

    if (updateData.branchId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.branchId)) {
        throw ErrorHelper.badRequest("Invalid branch ID format.");
      }
      if (this.branchRepository) {
        const branch = await this.branchRepository.findById(updateData.branchId);
        if (!branch) {
          throw ErrorHelper.notFound("Branch not found.");
        }
      }
    }

    if (updateData.unitPrice !== undefined) {
      const price = Number(updateData.unitPrice);
      if (isNaN(price) || price < 0) {
        throw ErrorHelper.badRequest("Unit price must be greater than or equal to 0.");
      }
    }

    return this.jumboXeroxRepository.update(id, updateData);
  }
}

module.exports = UpdateJumboXeroxMachine;
