/**
 * Module: production
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get index() {
      return require("./constants/index");
    },
  },
  controllers: {
    get deliveryOrder() {
      return require("./controllers/deliveryOrder.controller");
    },
    get productionDashboard() {
      return require("./controllers/productionDashboard.controller");
    },
    get productionOperation() {
      return require("./controllers/productionOperation.controller");
    },
    get productionOrder() {
      return require("./controllers/productionOrder.controller");
    },
    get productionQueue() {
      return require("./controllers/productionQueue.controller");
    },
    get productionReport() {
      return require("./controllers/productionReport.controller");
    },
    get productionResource() {
      return require("./controllers/productionResource.controller");
    },
    get qualityCheck() {
      return require("./controllers/qualityCheck.controller");
    },
    get reprintRequest() {
      return require("./controllers/reprintRequest.controller");
    },
  },
  dto: {
    get DeliveryOrderDto() {
      return require("./dto/DeliveryOrderDto");
    },
    get ProductionOperationDto() {
      return require("./dto/ProductionOperationDto");
    },
    get ProductionOrderDto() {
      return require("./dto/ProductionOrderDto");
    },
    get QualityCheckDto() {
      return require("./dto/QualityCheckDto");
    },
    get ReprintRequestDto() {
      return require("./dto/ReprintRequestDto");
    },
  },
  events: {
    get "productionEvents.listener"() {
      return require("./events/productionEvents.listener");
    },
  },
  helpers: {
    get ProductionHelper() {
      return require("./helpers/ProductionHelper");
    },
  },
  models: {
    get ProductionOperation() {
      return require("./models/ProductionOperation");
    },
    get ProductionOrder() {
      return require("./models/ProductionOrder");
    },
    get ProductionState() {
      return require("./models/ProductionState");
    },
    get QualityCheck() {
      return require("./models/QualityCheck");
    },
    get ReprintRequest() {
      return require("./models/ReprintRequest");
    },
  },
  routes: {
    get deliveryOrders() {
      return require("./routes/deliveryOrders.routes");
    },
    get productionDashboard() {
      return require("./routes/productionDashboard.routes");
    },
    get productionOperations() {
      return require("./routes/productionOperations.routes");
    },
    get productionOrders() {
      return require("./routes/productionOrders.routes");
    },
    get productionQueue() {
      return require("./routes/productionQueue.routes");
    },
    get productionReports() {
      return require("./routes/productionReports.routes");
    },
    get productionResources() {
      return require("./routes/productionResources.routes");
    },
    get qualityChecks() {
      return require("./routes/qualityChecks.routes");
    },
    get reprintRequests() {
      return require("./routes/reprintRequests.routes");
    },
  },
  services: {
    get deliveryOrder() {
      return require("./services/deliveryOrder.service");
    },
    get productionDashboard() {
      return require("./services/productionDashboard.service");
    },
    get productionOperation() {
      return require("./services/productionOperation.service");
    },
    get productionOrder() {
      return require("./services/productionOrder.service");
    },
    get productionPlanning() {
      return require("./services/productionPlanning.service");
    },
    get productionQueue() {
      return require("./services/productionQueue.service");
    },
    get productionReport() {
      return require("./services/productionReport.service");
    },
    get productionResource() {
      return require("./services/productionResource.service");
    },
    get productionSpecificationHelper() {
      return require("./services/productionSpecificationHelper");
    },
    get productionState() {
      return require("./services/productionState.service");
    },
    get qualityCheck() {
      return require("./services/qualityCheck.service");
    },
    get reprint() {
      return require("./services/reprint.service");
    },
    get rework() {
      return require("./services/rework.service");
    },
    get roundRobin() {
      return require("./services/roundRobin.service");
    },
  },
  validators: {
    get production() {
      return require("./validators/production.validator");
    },
  },
};
