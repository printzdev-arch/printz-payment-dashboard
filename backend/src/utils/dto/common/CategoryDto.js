/**
 * Category Data Transfer Objects (DTOs)
 */

class CreateCategoryDto {
  constructor({ categoryId, categoryName, name } = {}) {
    this.categoryId = typeof categoryId === "string" ? categoryId.trim() : (categoryId !== undefined && categoryId !== null ? String(categoryId).trim() : "");
    this.categoryName = typeof categoryName === "string" ? categoryName.trim() : (typeof name === "string" ? name.trim() : "");
  }

  static fromRequest(req) {
    return new CreateCategoryDto(req.body || {});
  }
}

class CategoryResponseDto {
  constructor(category) {
    if (!category) return;
    const rawId = category._id || category.id;
    this._id = rawId ? rawId.toString() : rawId;
    this.categoryId = category.categoryId;
    this.categoryName = category.categoryName || category.name;
    this.createdAt = category.createdAt;
    this.updatedAt = category.updatedAt;
  }

  static fromEntity(category) {
    if (!category) return null;
    return new CategoryResponseDto(category);
  }

  static fromEntities(categories = []) {
    if (!Array.isArray(categories)) return [];
    return categories.map((cat) => new CategoryResponseDto(cat));
  }
}

module.exports = {
  CreateCategoryDto,
  CategoryResponseDto,
};
