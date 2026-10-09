class GetEmployees {
  constructor({ employeeRepository }) {
    this.employeeRepository = employeeRepository;
  }

  async execute(filters = {}, pagination = { page: 1, limit: 50 }, authContext = {}) {
    return this.employeeRepository.findAll(filters, pagination, authContext);
  }
}

module.exports = GetEmployees;
