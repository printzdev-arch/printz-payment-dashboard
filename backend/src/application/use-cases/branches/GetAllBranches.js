class GetAllBranches {
  constructor({ branchRepository }) {
    this.branchRepository = branchRepository;
  }

  async execute(filters = {}) {
    return this.branchRepository.findAll(filters);
  }
}

module.exports = GetAllBranches;
