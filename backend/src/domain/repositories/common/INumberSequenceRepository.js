/**
 * INumberSequenceRepository Interface / Contract
 */
class INumberSequenceRepository {
  async incrementAndGet(sequenceKey, branchId, period) { throw new Error("Method not implemented"); }
  async findByKey(sequenceKey, branchId, period) { throw new Error("Method not implemented"); }
  async findAll(query, options) { throw new Error("Method not implemented"); }
}

module.exports = INumberSequenceRepository;
