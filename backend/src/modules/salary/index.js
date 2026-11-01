/**
 * Module: salary
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get salary() {
      return require("./controllers/salary.controller");
    },
  },
  models: {
    get EmployeeLoan() {
      return require("./models/EmployeeLoan");
    },
    get EmployeeSalaryStructure() {
      return require("./models/EmployeeSalaryStructure");
    },
    get LoanRepayment() {
      return require("./models/LoanRepayment");
    },
    get SalaryAdjustment() {
      return require("./models/SalaryAdjustment");
    },
    get SalaryComponent() {
      return require("./models/SalaryComponent");
    },
    get SalaryRecord() {
      return require("./models/SalaryRecord");
    },
    get SalaryRun() {
      return require("./models/SalaryRun");
    },
  },
  routes: {
    get salary() {
      return require("./routes/salary.routes");
    },
  },
  services: {
    get salary() {
      return require("./services/salary.service");
    },
  },
  validators: {
    get salary() {
      return require("./validators/salary.validator");
    },
  },
};
