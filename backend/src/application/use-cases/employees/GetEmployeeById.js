const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetEmployeeById {
  constructor({ employeeRepository }) {
    this.employeeRepository = employeeRepository;
  }

  async execute(id, authContext = {}) {
    const employee = await this.employeeRepository.findById(id, authContext);
    if (!employee) {
      // Return 404 regardless of whether the employee doesn't exist or is out-of-scope.
      // This prevents branch enumeration attacks.
      throw ErrorHelper.notFound("Employee not found.");
    }

    const assignments = await this.employeeRepository.getBranchAssignments(id);
    return {
      ...employee,
      assignments,
    };
  }
}

module.exports = GetEmployeeById;
