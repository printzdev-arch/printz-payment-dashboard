class GetCategories {
  constructor(categoryRepoOrOptions) {
    this.categoryRepository = categoryRepoOrOptions?.categoryRepository || categoryRepoOrOptions;
  }

  async execute() {
    return this.categoryRepository.findAll();
  }
}

module.exports = GetCategories;
