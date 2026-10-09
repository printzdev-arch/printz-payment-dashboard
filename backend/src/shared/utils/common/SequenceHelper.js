const numberSequenceService = require("../../../application/services/common/numberSequence.service");

class SequenceHelper {
  /**
   * Reusable helper to generate business document numbers (e.g. EMP-00001, JO-00001, APR-00001)
   */
  static async next(sequenceKey, options = {}) {
    return numberSequenceService.generateBusinessNumber(sequenceKey, options);
  }

  /**
   * Helper to fetch the next raw integer value.
   */
  static async nextValue(sequenceKey, branchId = null, period = null) {
    return numberSequenceService.getNextNumber(sequenceKey, branchId, period);
  }
}

module.exports = SequenceHelper;
