/**
 * Category Domain Entity
 */
class Category {
  constructor({
    _id,
    id,
    categoryId,
    categoryName,
    createdAt,
    updatedAt,
  } = {}) {
    this._id = _id || id;
    this.categoryId = categoryId;
    this.categoryName = categoryName;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Category;
