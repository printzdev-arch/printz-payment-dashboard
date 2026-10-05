const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetTotalAmountById {
  constructor({ totalAmountReadingRepository }) {
    this.totalAmountReadingRepository = totalAmountReadingRepository;
  }

  async execute(id) {
    const reading = await this.totalAmountReadingRepository.findById(id);
    if (!reading) {
      throw ErrorHelper.notFound("Total amount record not found");
    }
    return reading;
  }
}

module.exports = GetTotalAmountById;
