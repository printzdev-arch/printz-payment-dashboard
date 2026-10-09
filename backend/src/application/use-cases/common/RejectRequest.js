const approvalService = require("../../services/common/approval.service");

class RejectRequest {
  constructor(service = approvalService) {
    this.service = service;
  }

  async execute(id, data = {}, authContext = {}) {
    return this.service.reject(id, data, authContext);
  }
}

module.exports = RejectRequest;
