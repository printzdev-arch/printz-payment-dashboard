const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeleteJumboXeroxMachine {
  constructor(jumboRepoOrOptions) {
    this.jumboXeroxRepository = jumboRepoOrOptions?.jumboXeroxRepository || jumboRepoOrOptions;
  }

  async execute(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid machine ID format.");
    }

    const deleted = await this.jumboXeroxRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Jumbo Xerox machine not found.");
    }

    return { _id: id, message: "Machine deleted successfully" };
  }
}

module.exports = DeleteJumboXeroxMachine;
