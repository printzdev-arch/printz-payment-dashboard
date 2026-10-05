const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeleteJumboXeroxReading {
  constructor({ jumboXeroxReadingRepository }) {
    this.jumboXeroxReadingRepository = jumboXeroxReadingRepository;
  }

  async execute(id) {
    const deleted = await this.jumboXeroxReadingRepository.delete(id);
    if (!deleted) {
      throw ErrorHelper.notFound("Jumbo Xerox reading not found");
    }
    return { id, message: "Jumbo Xerox reading deleted successfully" };
  }
}

module.exports = DeleteJumboXeroxReading;
