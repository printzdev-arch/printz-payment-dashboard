const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeleteTotalAmount {
  constructor({ totalAmountReadingRepository }) {
    this.totalAmountReadingRepository = totalAmountReadingRepository;
  }

  async execute(id) {
    const deleted = await this.totalAmountReadingRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Total amount record not found");
    }
    return { id, message: "Record deleted successfully" };
  }
}

module.exports = DeleteTotalAmount;
