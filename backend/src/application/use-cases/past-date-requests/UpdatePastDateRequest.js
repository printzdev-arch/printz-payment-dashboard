const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdatePastDateRequest {
  constructor({ pastDateRequestRepository }) {
    this.pastDateRequestRepository = pastDateRequestRepository;
  }

  async execute(id, updateData) {
    if (updateData && typeof updateData.validate === "function") {
      updateData.validate();
    }

    const updated = await this.pastDateRequestRepository.update(id, updateData);
    if (!updated) {
      throw ErrorHelper.notFound("Past date request not found");
    }
    return updated;
  }
}

module.exports = UpdatePastDateRequest;
