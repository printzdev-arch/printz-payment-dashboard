class FinalizeDate {
  constructor({ finalizedDateRepository }) {
    this.finalizedDateRepository = finalizedDateRepository;
  }

  async execute(finalizedData) {
    const { branchName, date } = finalizedData;
    return this.finalizedDateRepository.finalize(branchName, date, finalizedData);
  }
}

module.exports = FinalizeDate;
