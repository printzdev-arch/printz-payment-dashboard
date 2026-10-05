class GetAllJumboXeroxMachines {
  constructor(jumboRepoOrOptions) {
    this.jumboXeroxRepository = jumboRepoOrOptions?.jumboXeroxRepository || jumboRepoOrOptions;
  }

  async execute(filters = {}) {
    return this.jumboXeroxRepository.findAll(filters);
  }
}

module.exports = GetAllJumboXeroxMachines;
