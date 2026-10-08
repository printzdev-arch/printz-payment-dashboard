const productionOrderRepository = require("./MongoProductionOrderRepository");
const productionOperationRepository = require("./MongoProductionOperationRepository");
const qualityCheckRepository = require("./MongoQualityCheckRepository");
const reprintRequestRepository = require("./MongoReprintRequestRepository");
const deliveryOrderRepository = require("./MongoDeliveryOrderRepository");
const jobOrderRepository = require("./MongoJobOrderRepository");
const productionStateRepository = require("./MongoProductionStateRepository");
const roundRobinRepository = require("./MongoRoundRobinRepository");

module.exports = {
  productionOrderRepository,
  productionOperationRepository,
  qualityCheckRepository,
  reprintRequestRepository,
  deliveryOrderRepository,
  jobOrderRepository,
  productionStateRepository,
  roundRobinRepository,
};
