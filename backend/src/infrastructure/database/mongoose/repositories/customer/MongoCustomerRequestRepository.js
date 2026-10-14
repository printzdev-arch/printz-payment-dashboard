const CustomerRequest = require("../../models/customer/CustomerRequest");

class MongoCustomerRequestRepository {
  async find(filter = {}, options = {}) {
    let query = CustomerRequest.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.populate) query = query.populate(options.populate);
    return query.exec();
  }

  async findById(id) {
    return CustomerRequest.findById(id);
  }

  async findOne(filter) {
    return CustomerRequest.findOne(filter);
  }

  async create(data) {
    return CustomerRequest.create(data);
  }

  async findByIdAndUpdate(id, updateData, options = { new: true }) {
    return CustomerRequest.findByIdAndUpdate(id, { $set: updateData }, options);
  }

  async countDocuments(filter = {}) {
    return CustomerRequest.countDocuments(filter);
  }
}

module.exports = new MongoCustomerRequestRepository();
