const sequenceHelper = require("../utils/helpers/sequence.helper");

class NumberSequenceService {
  async getNextNumber(sequenceKey, branchId = null, period = null) {
    return sequenceHelper.incrementAndGet(sequenceKey, branchId, period);
  }

  async generateBusinessNumber(sequenceKey, options = {}) {
    return sequenceHelper.generateBusinessNumber(sequenceKey, options);
  }

  async ensureMinimum(sequenceKey, minimumValue, options = {}) {
    return sequenceHelper.ensureMinimum(sequenceKey, minimumValue, options);
  }
}

module.exports = new NumberSequenceService();
