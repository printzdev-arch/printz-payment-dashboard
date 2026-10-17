const mongoose = require("mongoose");

const designAllocationLockSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      default: "DESIGNER_RR",
    },
    n: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const DesignAllocationLock =
  mongoose.models.DesignAllocationLock ||
  mongoose.model("DesignAllocationLock", designAllocationLockSchema, "designAllocationLocks");

module.exports = DesignAllocationLock;
