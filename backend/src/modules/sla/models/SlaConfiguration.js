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


// === INJECTED REPOSITORY STATICS ===

slaConfigurationSchema.statics.deactivate = async function (id) {
  return this.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
};

slaConfigurationSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};


if (typeof slaConfigurationSchema !== "undefined" && typeof SlaConfiguration !== "undefined" && slaConfigurationSchema.statics) {
  Object.assign(SlaConfiguration, slaConfigurationSchema.statics);
}

module.exports = SlaConfiguration;
