/**
 * Module: design
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get designConstants() {
      return require("./constants/designConstants");
    },
    get index() {
      return require("./constants/index");
    },
  },
  controllers: {
    get designAllocation() {
      return require("./controllers/designAllocation.controller");
    },
    get designSample() {
      return require("./controllers/designSample.controller");
    },
    get designWork() {
      return require("./controllers/designWork.controller");
    },
  },
  dto: {
    get DesignAllocationDto() {
      return require("./dto/DesignAllocationDto");
    },
    get DesignSampleDto() {
      return require("./dto/DesignSampleDto");
    },
    get DesignWorkDto() {
      return require("./dto/DesignWorkDto");
    },
  },
  events: {
    get "designEvents.listener"() {
      return require("./events/designEvents.listener");
    },
  },
  helpers: {
    get DesignHelper() {
      return require("./helpers/DesignHelper");
    },
  },
  models: {
    get DesignAllocationLock() {
      return require("./models/DesignAllocationLock");
    },
    get DesignApprovalToken() {
      return require("./models/DesignApprovalToken");
    },
    get JobAssignment() {
      return require("./models/JobAssignment");
    },
    get JobSample() {
      return require("./models/JobSample");
    },
    get RoundRobinPointer() {
      return require("./models/RoundRobinPointer");
    },
  },
  routes: {
    get design() {
      return require("./routes/design.routes");
    },
  },
  services: {
    get designAllocation() {
      return require("./services/designAllocation.service");
    },
    get designSample() {
      return require("./services/designSample.service");
    },
    get designWork() {
      return require("./services/designWork.service");
    },
  },
  validators: {
    get design() {
      return require("./validators/design.validator");
    },
  },
};
