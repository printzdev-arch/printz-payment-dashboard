const EstimateApproval = require("../../models/estimate/EstimateApproval");

class MongoEstimateApprovalRepository {
  async find(filter = {}, options = {}) {
    let query = EstimateApproval.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.populate) query = query.populate(options.populate);
    return query.exec();
  }

  async findById(id) {
    return EstimateApproval.findById(id);
  }

  async findOne(filter) {
    return EstimateApproval.findOne(filter);
  }

  async create(data) {
    return EstimateApproval.create(data);
  }

  async findByIdAndUpdate(id, updateData, options = { new: true }) {
    return EstimateApproval.findByIdAndUpdate(id, { $set: updateData }, options);
  }

  async updateMany(filter, updateData) {
    return EstimateApproval.updateMany(filter, { $set: updateData });
  }

  async countDocuments(filter = {}) {
    return EstimateApproval.countDocuments(filter);
  }
}

module.exports = new MongoEstimateApprovalRepository();
