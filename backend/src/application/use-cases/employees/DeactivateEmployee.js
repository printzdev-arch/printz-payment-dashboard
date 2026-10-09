const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const auditService = require("../../../infrastructure/audit/AuditService");

class DeactivateEmployee {
  constructor({ employeeRepository }) {
    this.employeeRepository = employeeRepository;
  }

  async execute(id, { reason, leftCompany }, authContext = {}) {
    const result = await this.employeeRepository.deactivate(id, { reason, leftCompany }, authContext);
    if (!result) {
      throw ErrorHelper.notFound("Employee not found.");
    }

    await auditService.log({
      event: "EMPLOYEE_DEACTIVATED",
      action: "EMPLOYEE_DEACTIVATE",
      userId: authContext.userId,
      resourceType: "Employee",
      resourceId: id,
      after: result,
      reason,
      status: "SUCCESS",
    });

    return result;
  }
}

module.exports = DeactivateEmployee;

