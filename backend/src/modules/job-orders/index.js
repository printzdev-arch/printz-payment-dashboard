/**
 * Module: job-orders
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get finishingServices() {
      return require("./models/finishingServices");
    },
    get index() {
      return require("./models/constants");
    },
    get jobStages() {
      return require("./models/jobStages");
    },
    get jobTransitions() {
      return require("./models/jobTransitions");
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
      return require("./models/JobEstimateDto");
    },
    get JobFileDto() {
      return require("./models/JobFileDto");
    },
    get JobOrderDto() {
      return require("./models/JobOrderDto");
    },
  },
  events: {
    get "jobEvents.emitter"() {
      return require("./services/jobEvents.emitter");
    },
  },
  helpers: {
    get JobOrderHelper() {
      return require("./services/JobOrderHelper");
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
      return require("./routes/jobOrder.validator");
    },
  },
};
