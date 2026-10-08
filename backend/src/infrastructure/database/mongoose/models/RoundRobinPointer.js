const mongoose = require("mongoose");

const roundRobinPointerSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // e.g. "BRANCH_<branchId>_OP_<operationCode>" or "BRANCH_<branchId>_TEAM_PRODUCTION"
    },
    currentIndex: {
      type: Number,
      default: 0,
    },
    lastAssignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastAssignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const RoundRobinPointer = mongoose.model(
  "RoundRobinPointer",
  roundRobinPointerSchema,
  "roundRobinPointers"
);

module.exports = RoundRobinPointer;
