const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeleteBranch {
  constructor({ branchRepository }) {
    this.branchRepository = branchRepository;
  }

  async execute(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid branch ID format.");
    }

    const branch = await this.branchRepository.delete(id);
    if (!branch) {
      throw ErrorHelper.notFound("Branch not found.");
    }
    return { _id: id, message: "Branch deleted successfully" };
  }
}

module.exports = DeleteBranch;
