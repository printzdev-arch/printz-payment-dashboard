/**
 * Request Validation Middleware Index
 */
const authValidators = require("./auth");
const commonValidators = require("./common");
const customerValidators = require("./customer");
const deliveryValidators = require("./delivery");
const designValidators = require("./design");
const inventoryValidators = require("./inventory");
const invoiceValidators = require("./invoice");
const jobOrderValidators = require("./job-order");
const posValidators = require("./pos");
const productOrderValidators = require("./product-order");
const productionValidators = require("./production");
const publicValidators = require("./public");
const settlementValidators = require("./settlement");
const slaValidators = require("./sla");

module.exports = {
  ...authValidators,
  ...commonValidators,
  ...customerValidators,
  ...deliveryValidators,
  ...designValidators,
  ...inventoryValidators,
  ...invoiceValidators,
  ...jobOrderValidators,
  ...posValidators,
  ...productOrderValidators,
  ...productionValidators,
  ...publicValidators,
  ...settlementValidators,
  ...slaValidators,
};
