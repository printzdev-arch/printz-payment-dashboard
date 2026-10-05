class GetAllJumboXeroxReadings {
  constructor({ jumboXeroxReadingRepository }) {
    this.jumboXeroxReadingRepository = jumboXeroxReadingRepository;
  }

  async execute(filters = {}) {
    return this.jumboXeroxReadingRepository.findAll(filters);
  }
}

module.exports = GetAllJumboXeroxReadings;
