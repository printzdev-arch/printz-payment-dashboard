/**
 * Module: sla
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get index() {
      return require("./constants/index");
    },
  },
  controllers: {
    get designerPerformance() {
      return require("./controllers/designerPerformance.controller");
    },
    get designerRating() {
      return require("./controllers/designerRating.controller");
    },
    get sla() {
      return require("./controllers/sla.controller");
    },
    get slaConfiguration() {
      return require("./controllers/slaConfiguration.controller");
    },
  },
  dto: {
    get DesignerPerformanceDto() {
      return require("./dto/DesignerPerformanceDto");
    },
    get DesignerRatingDto() {
      return require("./dto/DesignerRatingDto");
    },
    get SlaConfigurationDto() {
      return require("./dto/SlaConfigurationDto");
    },
    get SlaStatusDto() {
      return require("./dto/SlaStatusDto");
    },
  },
  events: {
    get "slaEvents.listener"() {
      return require("./events/slaEvents.listener");
    },
  },
  helpers: {
    get SlaHelper() {
      return require("./helpers/SlaHelper");
    },
  },
  models: {
    get DesignerRating() {
      return require("./models/DesignerRating");
    },
    get SlaConfiguration() {
      return require("./models/SlaConfiguration");
    },
  },
  routes: {
    get designerPerformance() {
      return require("./routes/designerPerformance.routes");
    },
    get designerRating() {
      return require("./routes/designerRating.routes");
    },
    get sla() {
      return require("./routes/sla.routes");
    },
    get slaConfiguration() {
      return require("./routes/slaConfiguration.routes");
    },
  },
  services: {
    get designerPerformance() {
      return require("./services/designerPerformance.service");
    },
    get designerRating() {
      return require("./services/designerRating.service");
    },
    get sla() {
      return require("./services/sla.service");
    },
    get slaConfiguration() {
      return require("./services/slaConfiguration.service");
    },
    get slaScheduler() {
      return require("./services/slaScheduler.service");
    },
  },
  validators: {
    get sla() {
      return require("./validators/sla.validator");
    },
  },
};
