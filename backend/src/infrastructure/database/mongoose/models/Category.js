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

const Category = mongoose.model("Category", categorySchema, "categories");

module.exports = Category;
