const auditLogService = require("../../services/common/auditLog.service");

class CreateAuditLog {
  constructor(service = auditLogService) {
    this.service = service;
  }

  async execute(dto) {
    return this.service.log(dto);
  }
}

class GetAuditLogs {
  constructor(service = auditLogService) {
    this.service = service;
  }

  async execute(filters = {}, pagination = {}, authContext = {}) {
    return this.service.getAuditLogs(filters, pagination, authContext);
  }
}

module.exports = {
  CreateAuditLog,
  GetAuditLogs,
};
