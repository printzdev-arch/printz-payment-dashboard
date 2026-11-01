/**
 * Module: general
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get index() {
      return require("./constants/index");
    },
  },
  controllers: {
    get general() {
      return require("./controllers/general.controller");
    },
  },
  dto: {
    get CommonDto() {
      return require("./dto/CommonDto");
    },
    get GeneralDto() {
      return require("./dto/GeneralDto");
    },
  },
  events: {
    get "commonEvents.listener"() {
      return require("./events/commonEvents.listener");
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
