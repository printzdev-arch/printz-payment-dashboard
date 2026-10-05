class GetFinalizedDates {
  constructor({ finalizedDateRepository }) {
    this.finalizedDateRepository = finalizedDateRepository;
  }

  async execute(filters = {}) {
    return this.finalizedDateRepository.findAll(filters);
  }
}

module.exports = GetFinalizedDates;
