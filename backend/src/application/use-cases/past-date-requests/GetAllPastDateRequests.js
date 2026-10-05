class GetAllPastDateRequests {
  constructor({ pastDateRequestRepository }) {
    this.pastDateRequestRepository = pastDateRequestRepository;
  }

  async execute(filters = {}) {
    return this.pastDateRequestRepository.findAll(filters);
  }
}

module.exports = GetAllPastDateRequests;
