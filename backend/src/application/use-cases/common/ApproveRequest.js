const approvalService = require("../../services/common/approval.service");

class ApproveRequest {
  constructor(service = approvalService) {
    this.service = service;
  }

  async execute(id, data = {}, authContext = {}) {
    return this.service.approve(id, data, authContext);
  }
}

module.exports = ApproveRequest;
