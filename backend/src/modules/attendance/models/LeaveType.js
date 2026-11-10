const mongoose = require("mongoose");

const LeaveTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    annualAllocation: {
      type: Number,
      default: 12,
    },
    allowHalfDay: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "leavetypes",
  }
);

module.exports = mongoose.models.LeaveType || mongoose.model("LeaveType", LeaveTypeSchema);
