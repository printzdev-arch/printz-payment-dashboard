const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetJumboXeroxMachineById {
  constructor(jumboRepoOrOptions) {
    this.jumboXeroxRepository = jumboRepoOrOptions?.jumboXeroxRepository || jumboRepoOrOptions;
  }

  async execute(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid machine ID format.");
    }

    const machine = await this.jumboXeroxRepository.findById(id);
    if (!machine) {
      throw ErrorHelper.notFound("Jumbo Xerox machine not found.");
    }

    return machine;
  }
}

module.exports = GetJumboXeroxMachineById;
