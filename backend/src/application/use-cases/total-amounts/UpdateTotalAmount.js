const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdateTotalAmount {
  constructor({ totalAmountReadingRepository }) {
    this.totalAmountReadingRepository = totalAmountReadingRepository;
  }

  async execute(id, updateData) {
    if (updateData && typeof updateData.validate === "function") {
      updateData.validate();
    }
    const reading = await this.totalAmountReadingRepository.update(id, updateData);
    if (!reading) {
      throw ErrorHelper.notFound("Total amount record not found");
    }
    return reading;
  }
}

module.exports = UpdateTotalAmount;
