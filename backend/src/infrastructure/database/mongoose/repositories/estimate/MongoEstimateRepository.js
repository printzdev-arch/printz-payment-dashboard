const Estimate = require("../../models/estimate/Estimate");

class MongoEstimateRepository {
  async find(filter = {}, options = {}) {
    let query = Estimate.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.populate) query = query.populate(options.populate);
    return query.exec();
  }

  async findById(id) {
    return Estimate.findById(id);
  }

  async findOne(filter) {
    return Estimate.findOne(filter);
  }

  async create(data) {
    return Estimate.create(data);
  }

  async findByIdAndUpdate(id, updateData, options = { new: true }) {
    return Estimate.findByIdAndUpdate(id, { $set: updateData }, options);
  }

  async updateMany(filter, updateData) {
    return Estimate.updateMany(filter, { $set: updateData });
  }

  async countDocuments(filter = {}) {
    return Estimate.countDocuments(filter);
  }
}

module.exports = new MongoEstimateRepository();
