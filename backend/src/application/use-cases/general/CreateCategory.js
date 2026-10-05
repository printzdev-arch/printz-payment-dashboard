const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class CreateCategory {
  constructor(categoryRepoOrOptions) {
    this.categoryRepository = categoryRepoOrOptions?.categoryRepository || categoryRepoOrOptions;
  }

  async execute(categoryData = {}) {
    const categoryId = categoryData.categoryId ? String(categoryData.categoryId).trim() : "";
    const categoryName = categoryData.categoryName
      ? String(categoryData.categoryName).trim()
      : categoryData.name
      ? String(categoryData.name).trim()
      : "";

    if (!categoryId) {
      throw ErrorHelper.badRequest("Category ID is required.");
    }

    if (!categoryName) {
      throw ErrorHelper.badRequest("Category name is required.");
    }

    const existing = await this.categoryRepository.findByCategoryId(categoryId);
    if (existing) {
      throw ErrorHelper.conflict(`Category ID '${categoryId}' already exists.`);
    }

    return this.categoryRepository.create({
      categoryId,
      categoryName,
    });
  }
}

module.exports = CreateCategory;
