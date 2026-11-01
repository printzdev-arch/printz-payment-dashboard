/**
 * Module: reports
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get report() {
      return require("./controllers/report.controller");
    },
  },
  routes: {
    get report() {
      return require("./routes/report.routes");
    },
  },
  services: {
    get report() {
      return require("./services/report.service");
    },
  },
};
