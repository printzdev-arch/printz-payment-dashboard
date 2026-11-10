const mongoose = require("mongoose");

const settingItemSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
  },
  { _id: true, timestamps: true }
);

const masterSettingSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      type: String,
      default: "Sliders",
    },
    items: [settingItemSchema],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const MasterSetting =
  mongoose.models.MasterSetting ||
  mongoose.model("MasterSetting", masterSettingSchema, "masterSettings");

module.exports = MasterSetting;
