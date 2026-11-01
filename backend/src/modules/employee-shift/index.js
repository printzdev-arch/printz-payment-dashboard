/**
 * Module: employee-shift
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get employeeShift() {
      return require("./controllers/employeeShift.controller");
    },
  },
  routes: {
    get employeeShift() {
      return require("./routes/employeeShift.routes");
    },
  },
  services: {
    get employeeShift() {
      return require("./services/employeeShift.service");
    },
  },
};
