/**
 * Module: estimates
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get estimate() {
      return require("./controllers/estimate.controller");
    },
  },
  models: {
    get Estimate() {
      return require("./models/Estimate");
    },
    get EstimateApproval() {
      return require("./models/EstimateApproval");
    },
  },
  routes: {
    get estimate() {
      return require("./routes/estimate.routes");
    },
  },
  services: {
    get estimate() {
      return require("./services/estimate.service");
    },
  },
};
