/**
 * Module: departments
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get department() {
      return require("./controllers/department.controller");
    },
  },
  models: {
    get Department() {
      return require("./models/Department");
    },
  },
  routes: {
    get department() {
      return require("./routes/department.routes");
    },
  },
  services: {
    get department() {
      return require("./services/department.service");
    },
  },
};
