/**
 * Module: designations
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get designation() {
      return require("./controllers/designation.controller");
    },
  },
  models: {
    get Designation() {
      return require("./models/Designation");
    },
  },
  routes: {
    get designation() {
      return require("./routes/designation.routes");
    },
  },
  services: {
    get designation() {
      return require("./services/designation.service");
    },
  },
};
