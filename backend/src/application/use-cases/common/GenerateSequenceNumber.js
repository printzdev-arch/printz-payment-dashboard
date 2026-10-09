const numberSequenceService = require("../../services/common/numberSequence.service");

class GenerateSequenceNumber {
  constructor(service = numberSequenceService) {
    this.service = service;
  }

  async execute(entityType, options = {}) {
    return this.service.generateBusinessNumber(entityType, options);
  }
}

module.exports = GenerateSequenceNumber;
