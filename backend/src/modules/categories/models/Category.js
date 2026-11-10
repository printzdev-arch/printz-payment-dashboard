const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      required: [true, "Category ID is required"],
      unique: true,
      trim: true,
    },
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        ret._id = ret._id ? ret._id.toString() : ret._id;
        delete ret.__v;
        delete ret.id;
        delete ret.legacyFirestoreId;
        delete ret.description;
        delete ret.type;
        return ret;
      },
    },
  }
);


categorySchema.statics.findAll = async function () {
  return this.find().sort({ categoryId: 1 });
};

categorySchema.statics.findByCategoryId = async function (categoryId) {
  if (!categoryId) return null;
  return this.findOne({ categoryId: String(categoryId).trim() });
};

categorySchema.statics.create = async function (data) {
  const toSave = { ...data };
  delete toSave._id;
  delete toSave.id;
  const category = new this(toSave);
  await category.save();
  return category;
};

const Category = mongoose.model("Category", categorySchema, "categories");

if (typeof categorySchema !== "undefined" && typeof Category !== "undefined" && categorySchema.statics) {
  Object.assign(Category, categorySchema.statics);
}

module.exports = Category;
