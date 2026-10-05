class SaveJumboXeroxReading {
  constructor({ jumboXeroxReadingRepository }) {
    this.jumboXeroxReadingRepository = jumboXeroxReadingRepository;
  }

  async execute(readingData) {
    return this.jumboXeroxReadingRepository.save(readingData);
  }
}

module.exports = SaveJumboXeroxReading;
