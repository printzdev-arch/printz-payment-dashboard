const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeletePastDateRequest {
  constructor({ pastDateRequestRepository }) {
    this.pastDateRequestRepository = pastDateRequestRepository;
  }

  async execute(id) {
    const deleted = await this.pastDateRequestRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Request not found");
    }
    return { id, message: "Past date request deleted successfully" };
  }
}

module.exports = DeletePastDateRequest;
