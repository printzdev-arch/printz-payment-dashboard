const IDesignerRatingRepository = require("../../../../../domain/repositories/sla/IDesignerRatingRepository");
const DesignerRating = require("../../models/sla/DesignerRating");

class DesignerRatingRepository extends IDesignerRatingRepository {
  async find(query = {}) {
    return DesignerRating.find(query)
      .populate("designerId", "name email employeeCode")
      .populate("ratedBy", "name email role")
      .populate("jobOrderId", "jobNo customerSnapshot status currentStage")
      .sort({ ratedAt: -1 });
  }

  async findById(id) {
    return DesignerRating.findById(id)
      .populate("designerId", "name email employeeCode")
      .populate("ratedBy", "name email role")
      .populate("jobOrderId", "jobNo customerSnapshot status currentStage");
  }

  async findOne(query = {}) {
    return DesignerRating.findOne(query);
  }

  async create(data) {
    return DesignerRating.create(data);
  }

  async aggregate(pipeline) {
    return DesignerRating.aggregate(pipeline);
  }

  async countDocuments(query = {}) {
    return DesignerRating.countDocuments(query);
  }
}

module.exports = new DesignerRatingRepository();
