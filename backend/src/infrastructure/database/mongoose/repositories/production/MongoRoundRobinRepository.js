const User = require("../../models/User");
const RoundRobinPointer = require("../../models/RoundRobinPointer");

class MongoRoundRobinRepository {
  async findUsers(query = {}) {
    return User.find(query).sort({ _id: 1 }).lean();
  }

  async incrementPointer(pointerKey) {
    return RoundRobinPointer.findOneAndUpdate(
      { key: pointerKey },
      { $inc: { currentIndex: 1 }, $set: { updatedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  async updateLastAssigned(pointerKey, userId) {
    return RoundRobinPointer.updateOne(
      { key: pointerKey },
      {
        $set: {
          lastAssignedUserId: userId,
          lastAssignedAt: new Date(),
        },
      }
    );
  }
}

module.exports = new MongoRoundRobinRepository();
