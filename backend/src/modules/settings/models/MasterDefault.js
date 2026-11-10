const mongoose = require("mongoose");

/**
 * MasterDefault Model
 * Dedicated separate collection in MongoDB ("masterDefaults")
 * Each specification option across all pages is stored as its own individual document.
 */
const masterDefaultSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    categoryLabel: {
      type: String,
      trim: true,
      default: "",
    },
    categoryGroup: {
      type: String,
      trim: true,
      default: "general", // "print_substrate", "colors_sides", "finishing_effects", "order_workflow"
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    config: {
      type: String,
      trim: true,
      default: "",
    },
    defaultPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: "pcs",
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "masterDefaults", // Dedicated separate MongoDB collection!
  }
);

masterDefaultSchema.index({ category: 1, order: 1 });
masterDefaultSchema.index({ category: 1, isActive: 1 });
masterDefaultSchema.index({ category: 1, isDefault: 1 });
masterDefaultSchema.index({ name: 1 });

const MasterDefault =
  mongoose.models.MasterDefault ||
  mongoose.model("MasterDefault", masterDefaultSchema, "masterDefaults");

module.exports = MasterDefault;
