const ICategoryRepository = require("../../../../domain/repositories/ICategoryRepository");
const Category = require("../models/Category");

class MongoCategoryRepository extends ICategoryRepository {
  async findAll() {
    return Category.find().sort({ categoryId: 1 });
  }

  async findById(id) {
    return Category.findById(id);
  }

  async findByCategoryId(categoryId) {
    if (!categoryId) return null;
    return Category.findOne({ categoryId: String(categoryId).trim() });
  }

  async create(data) {
    const toSave = { ...data };
    delete toSave._id;
    delete toSave.id;

    const category = new Category(toSave);
    await category.save();
    return category;
  }
}

module.exports = new MongoCategoryRepository();
