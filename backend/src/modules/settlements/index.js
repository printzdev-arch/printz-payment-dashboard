/**
 * Module: settlements
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get jobClosure() {
      return require("./controllers/jobClosure.controller");
    },
    get settlement() {
      return require("./controllers/settlement.controller");
    },
    get settlementReport() {
      return require("./controllers/settlementReport.controller");
    },
  },
  dto: {
    get PaymentDto() {
      return require("./models/PaymentDto");
    },
  },
  routes: {
    get settlement() {
      return require("./routes/settlement.routes");
    },
  },
  services: {
    get collectionReport() {
      return require("./services/collectionReport.service");
    },
    get jobClosure() {
      return require("./services/jobClosure.service");
    },
    get settlement() {
      return require("./services/settlement.service");
    },
  },
  validators: {
    get settlement() {
      return require("./routes/settlement.validator");
    },
  },
};
