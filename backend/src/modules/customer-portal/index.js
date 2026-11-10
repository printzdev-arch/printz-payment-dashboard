/**
 * Module: customer-portal
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get customerPortal() {
      return require("./controllers/customerPortal.controller");
    },
  },
  routes: {
    get customerPortal() {
      return require("./routes/customerPortal.routes");
    },
  },
  services: {
    get customerPortal() {
      return require("./services/customerPortal.service");
    },
  },
};
