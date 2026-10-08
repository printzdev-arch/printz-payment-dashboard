const mongoose = require("mongoose");

const slaConfigurationSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      required: [true, "SLA stage code is required"],
      trim: true,
      index: true,
    },
    jobType: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["NORMAL", "URGENT", null],
      default: null,
      index: true,
    },
    targetMinutes: {
      type: Number,
      required: [true, "targetMinutes is required"],
      min: [1, "targetMinutes must be greater than 0"],
    },
    warningMinutes: {
      type: Number,
      required: [true, "warningMinutes is required"],
      min: [0, "warningMinutes cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

slaConfigurationSchema.index({ stage: 1, jobType: 1, priority: 1, isActive: 1 });

const SlaConfiguration = mongoose.model(
  "SlaConfiguration",
  slaConfigurationSchema,
  "slaConfigurations"
);

module.exports = SlaConfiguration;
