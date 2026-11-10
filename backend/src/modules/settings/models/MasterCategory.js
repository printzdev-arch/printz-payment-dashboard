const mongoose = require("mongoose");

/**
 * MasterCategory Model
 * Stored in dedicated MongoDB collection: "masterCategories"
 * Stores all specification category definitions, groups, and icons in the database.
 */
const masterCategorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    categoryGroup: {
      type: String,
      trim: true,
      default: "general", // "print_substrate", "colors_sides", "finishing_effects", "order_workflow"
    },
    icon: {
      type: String,
      trim: true,
      default: "Sliders",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "masterCategories", // Dedicated MongoDB collection!
  }
);

masterCategorySchema.index({ order: 1 });

const MasterCategory =
  mongoose.models.MasterCategory ||
  mongoose.model("MasterCategory", masterCategorySchema, "masterCategories");

module.exports = MasterCategory;
