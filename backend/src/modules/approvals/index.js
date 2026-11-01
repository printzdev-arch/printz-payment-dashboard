/**
 * Module: approvals
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get approval() {
      return require("./controllers/approval.controller");
    },
  },
  helpers: {
    get ApprovalHelper() {
      return require("./helpers/ApprovalHelper");
    },
  },
  models: {
    get Approval() {
      return require("./models/Approval");
    },
  },
  routes: {
    get approval() {
      return require("./routes/approval.routes");
    },
  },
  services: {
    get approval() {
      return require("./services/approval.service");
    },
  },
};
