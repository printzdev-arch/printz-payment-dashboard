const IFinalizedDateRepository = require("../../../../domain/repositories/IFinalizedDateRepository");
const FinalizedDate = require("../models/FinalizedDate");

class MongoFinalizedDateRepository extends IFinalizedDateRepository {
  async findAll(filters = {}) {
    const query = {};
    if (filters.branchName) query.branchName = filters.branchName;
    if (filters.date) query.date = filters.date;
    return FinalizedDate.find(query);
  }

  async findByBranchAndDate(branchName, date) {
    return FinalizedDate.findOne({ branchName, date });
  }

  async finalize(branchName, date, data) {
    return FinalizedDate.findOneAndUpdate(
      { branchName, date },
      { ...data, isFinalized: true },
      { upsert: true, new: true }
    );
  }
}

module.exports = new MongoFinalizedDateRepository();
