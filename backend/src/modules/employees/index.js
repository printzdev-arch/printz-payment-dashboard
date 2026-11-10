/**
 * Module: employees
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get employee() {
      return require("./controllers/employee.controller");
    },
  },
  dto: {
    get EmployeeDto() {
      return require("./models/EmployeeDto");
    },
  },
  models: {
    get Employee() {
      return require("./models/Employee");
    },
    get EmployeeBranchAssignment() {
      return require("./models/EmployeeBranchAssignment");
    },
  },
  routes: {
    get employee() {
      return require("./routes/employee.routes");
    },
  },
  services: {
    get employee() {
      return require("./services/employee.service");
    },
  },
};
