const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetPastDateRequestById {
  constructor({ pastDateRequestRepository }) {
    this.pastDateRequestRepository = pastDateRequestRepository;
  }

  async execute(id) {
    const request = await this.pastDateRequestRepository.findById(id);
    if (!request) {
      throw ErrorHelper.notFound("Request not found");
    }
    return request;
  }
}

module.exports = GetPastDateRequestById;
