const pastDateRequestRepository = require("../../models/common/PastDateRequest");
const ApiError = require("../../utils/ApiError");

class PastDateRequestService {
  constructor(repo = pastDateRequestRepository) {
    this.repo = repo;
  }

  async getAllRequests(filters = {}) {
    return this.repo.findAll(filters);
  }

  async getRequestById(id) {
    const request = await this.repo.findById(id);
    if (!request) {
      throw ApiError.notFound("Past date request not found");
    }
    return request;
  }

  async createRequest(dto) {
    if (dto && typeof dto.validate === "function") {
      dto.validate();
    }
    return this.repo.create(dto);
  }

  async updateRequest(id, dto) {
    if (dto && typeof dto.validate === "function") {
      dto.validate();
    }
    const request = await this.repo.update(id, dto);
    if (!request) {
      throw ApiError.notFound("Past date request not found");
    }
    return request;
  }

  async deleteRequest(id) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw ApiError.notFound("Past date request not found");
    }
    return { success: true };
  }
}

module.exports = new PastDateRequestService();
