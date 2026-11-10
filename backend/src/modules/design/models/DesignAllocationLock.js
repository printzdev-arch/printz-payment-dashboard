const mongoose = require("mongoose");

/**
 * One document per lock name. `lockedUntil` makes the lock expire by itself, so a crashed
 * server can never leave the designer allocation stuck.
 */
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
    owner: {
      type: String,
      default: null,
    },
    lockedUntil: {
      type: Date,
      default: null,
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
