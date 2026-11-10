/**
 * Module: general
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get index() {
      return require("./models/constants");
    },
  },
  controllers: {
    get general() {
      return require("./controllers/general.controller");
    },
  },
  dto: {
    get CommonDto() {
      return require("./models/CommonDto");
    },
    get GeneralDto() {
      return require("./models/GeneralDto");
    },
  },
  events: {
    get "commonEvents.listener"() {
      return require("./services/commonEvents.listener");
    },
  },
  routes: {
    get general() {
      return require("./routes/general.routes");
    },
  },
  services: {
    get general() {
      return require("./services/general.service");
    },
  },
};
