const IJobAssignmentRepository = require("../../../../../domain/repositories/design/IJobAssignmentRepository");
const JobAssignment = require("../../models/design/JobAssignment");

class MongoJobAssignmentRepository extends IJobAssignmentRepository {
  async find(query = {}) {
    return JobAssignment.find(query)
      .populate("employeeId", "name email role phone")
      .populate("assignedBy", "name email role")
      .sort({ sequenceNo: 1 });
  }

  async findById(id) {
    return JobAssignment.findById(id)
      .populate("employeeId", "name email role phone")
      .populate("assignedBy", "name email role");
  }

  async findOne(query = {}) {
    return JobAssignment.findOne(query)
      .populate("employeeId", "name email role phone")
      .populate("assignedBy", "name email role");
  }

  async create(data) {
    return JobAssignment.create(data);
  }

  async update(id, updateData) {
    return JobAssignment.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async updateMany(filter, updateData) {
    return JobAssignment.updateMany(filter, { $set: updateData });
  }

  async countDocuments(filter = {}) {
    return JobAssignment.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return JobAssignment.aggregate(pipeline);
  }
}

module.exports = new MongoJobAssignmentRepository();
