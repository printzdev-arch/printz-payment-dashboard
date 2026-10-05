class CreatePastDateRequest {
  constructor({ pastDateRequestRepository }) {
    this.pastDateRequestRepository = pastDateRequestRepository;
  }

  async execute(dto) {
    if (dto && typeof dto.validate === "function") {
      dto.validate();
    }
    return this.pastDateRequestRepository.create(dto);
  }
}

module.exports = CreatePastDateRequest;
