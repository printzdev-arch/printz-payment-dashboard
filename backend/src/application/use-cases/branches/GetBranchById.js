const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetBranchById {
  constructor({ branchRepository }) {
    this.branchRepository = branchRepository;
  }

  async execute(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid branch ID format.");
    }

    const branch = await this.branchRepository.findById(id);
    if (!branch) {
      throw ErrorHelper.notFound("Branch not found.");
    }
    return branch;
  }
}

module.exports = GetBranchById;
