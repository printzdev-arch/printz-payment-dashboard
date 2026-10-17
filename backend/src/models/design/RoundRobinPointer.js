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


// === INJECTED REPOSITORY STATICS ===

roundRobinPointerSchema.statics.incrementPointer = async function (category = "default", totalItems = 1) {
  if (totalItems <= 0) return 0;
  const doc = await this.findOneAndUpdate(
    { category },
    { $inc: { pointer: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return (doc.pointer - 1) % totalItems;
};



roundRobinPointerSchema.statics.findUsers = async function(query = {}) {
  const mongoose = require("mongoose");
  const User = mongoose.model("User");
  return User.find(query).sort({ _id: 1 }).lean();
};

roundRobinPointerSchema.statics.updateLastAssigned = async function(pointerKey, userId) {
  return this.updateOne(
    { key: pointerKey },
    {
      $set: {
        lastAssignedUserId: userId,
        lastAssignedAt: new Date(),
      },
    }
  );
};

if (typeof roundRobinPointerSchema !== "undefined" && typeof RoundRobinPointer !== "undefined" && roundRobinPointerSchema.statics) {
  Object.assign(RoundRobinPointer, roundRobinPointerSchema.statics);
}

module.exports = RoundRobinPointer;
