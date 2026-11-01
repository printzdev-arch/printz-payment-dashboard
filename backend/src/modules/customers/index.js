/**
 * Module: customers
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get index() {
      return require("./constants/index");
    },
  },
  controllers: {
    get customer() {
      return require("./controllers/customer.controller");
    },
    get customerRequest() {
      return require("./controllers/customerRequest.controller");
    },
  },
  dto: {
    get CustomerDto() {
      return require("./dto/CustomerDto");
    },
  },
  events: {
    get "customerEvents.emitter"() {
      return require("./events/customerEvents.emitter");
    },
  },
  helpers: {
    get CustomerHelper() {
      return require("./helpers/CustomerHelper");
    },
  },
  models: {
    get Customer() {
      return require("./models/Customer");
    },
    get CustomerRequest() {
      return require("./models/CustomerRequest");
    },
  },
  routes: {
    get customer() {
      return require("./routes/customer.routes");
    },
    get customerRequest() {
      return require("./routes/customerRequest.routes");
    },
  },
  services: {
    get customer() {
      return require("./services/customer.service");
    },
    get customerMatching() {
      return require("./services/customerMatching.service");
    },
  },
  validators: {
    get customer() {
      return require("./validators/customer.validator");
    },
  },
};
