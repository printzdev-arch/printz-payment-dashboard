const approvalService = require("../../services/common/approval.service");

class CreateApproval {
  constructor(service = approvalService) {
    this.service = service;
  }

  async execute(dto) {
    return this.service.createApproval(dto);
  }
}

module.exports = CreateApproval;
