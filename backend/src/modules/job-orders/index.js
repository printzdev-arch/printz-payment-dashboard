/**
 * Module: job-orders
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get finishingServices() {
      return require("./constants/finishingServices");
    },
    get index() {
      return require("./constants/index");
    },
    get jobStages() {
      return require("./constants/jobStages");
    },
    get jobTransitions() {
      return require("./constants/jobTransitions");
    },
  },
  controllers: {
    get jobEstimate() {
      return require("./controllers/jobEstimate.controller");
    },
    get jobFile() {
      return require("./controllers/jobFile.controller");
    },
    get jobInvoice() {
      return require("./controllers/jobInvoice.controller");
    },
    get jobOrder() {
      return require("./controllers/jobOrder.controller");
    },
  },
  dto: {
    get JobEstimateDto() {
      return require("./dto/JobEstimateDto");
    },
    get JobFileDto() {
      return require("./dto/JobFileDto");
    },
    get JobOrderDto() {
      return require("./dto/JobOrderDto");
    },
  },
  events: {
    get "jobEvents.emitter"() {
      return require("./events/jobEvents.emitter");
    },
  },
  helpers: {
    get JobOrderHelper() {
      return require("./helpers/JobOrderHelper");
    },
  },
  models: {
    get JobApproval() {
      return require("./models/JobApproval");
    },
    get JobFile() {
      return require("./models/JobFile");
    },
    get JobItem() {
      return require("./models/JobItem");
    },
    get JobOrder() {
      return require("./models/JobOrder");
    },
    get JobWorkflowEvent() {
      return require("./models/JobWorkflowEvent");
    },
  },
  routes: {
    get jobOrder() {
      return require("./routes/jobOrder.routes");
    },
  },
  services: {
    get jobEstimate() {
      return require("./services/jobEstimate.service");
    },
    get jobFile() {
      return require("./services/jobFile.service");
    },
    get jobInvoice() {
      return require("./services/jobInvoice.service");
    },
    get jobOrder() {
      return require("./services/jobOrder.service");
    },
    get jobWorkflow() {
      return require("./services/jobWorkflow.service");
    },
  },
  validators: {
    get jobOrder() {
      return require("./validators/jobOrder.validator");
    },
  },
};
