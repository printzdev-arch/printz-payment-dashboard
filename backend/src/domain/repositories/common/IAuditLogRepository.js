/**
 * IAuditLogRepository Interface / Contract
 */
class IAuditLogRepository {
  async create(data) { throw new Error("Method not implemented"); }
  async findAll(query, options) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByEntity(entityType, entityId, options) { throw new Error("Method not implemented"); }
  async findLogins(filter, options) { throw new Error("Method not implemented"); }
  async findByEmployee(employeeId, options) { throw new Error("Method not implemented"); }
  async getSummary(query) { throw new Error("Method not implemented"); }
}

module.exports = IAuditLogRepository;
