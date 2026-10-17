const totalAmountReadingRepository = require("../../models/common/TotalAmountReading");
const ApiError = require("../../utils/ApiError");

class TotalAmountService {
  constructor(repo = totalAmountReadingRepository) {
    this.repo = repo;
  }

  async getAllTotalAmounts(filters = {}) {
    return this.repo.findAll(filters);
  }

  async getTotalAmountById(id) {
    const reading = await this.repo.findById(id);
    if (!reading) {
      throw ApiError.notFound("Total amount record not found");
    }
    return reading;
  }

  async saveTotalAmount(readingData) {
    if (readingData && typeof readingData.validate === "function") {
      readingData.validate();
    }
    return this.repo.save(readingData);
  }

  async updateTotalAmount(id, readingData) {
    if (readingData && typeof readingData.validate === "function") {
      readingData.validate();
    }
    const reading = await this.repo.update(id, readingData);
    if (!reading) {
      throw ApiError.notFound("Total amount record not found");
    }
    return reading;
  }

  async deleteTotalAmount(id) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw ApiError.notFound("Total amount record not found");
    }
    return { success: true };
  }
}

module.exports = new TotalAmountService();
