/**
 * IDesignerRatingRepository Interface / Contract
 */
class IDesignerRatingRepository {
  async find(query = {}) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findOne(query = {}) { throw new Error("Method not implemented"); }
  async create(data) { throw new Error("Method not implemented"); }
  async aggregate(pipeline) { throw new Error("Method not implemented"); }
  async countDocuments(query = {}) { throw new Error("Method not implemented"); }
}

module.exports = IDesignerRatingRepository;
