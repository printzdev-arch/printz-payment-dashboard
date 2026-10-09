const IPermissionRepository = require("../../../../domain/repositories/IPermissionRepository");
const Permission = require("../models/Permission");

class MongoPermissionRepository extends IPermissionRepository {
  async findAll() {
    return Permission.find().sort({ module: 1, code: 1 }).lean();
  }

  async findByModule(module) {
    if (!module) return [];
    return Permission.find({ module }).sort({ code: 1 }).lean();
  }

  async bulkUpsert(operations) {
    if (!operations || operations.length === 0) return { upsertedCount: 0, modifiedCount: 0 };
    return Permission.bulkWrite(operations, { ordered: false });
  }
}

module.exports = new MongoPermissionRepository();
