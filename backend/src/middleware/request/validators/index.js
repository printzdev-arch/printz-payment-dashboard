/**
 * Request Validation Middleware Index
 */
const authValidators = require("../../../modules/auth/routes/validators");
const commonValidators = require("./common");
const customerValidators = require("../../../modules/customers/routes/customer.validator");
const deliveryValidators = require("../../../modules/delivery/routes/delivery.validator");
const designValidators = require("../../../modules/design/routes/design.validator");
const inventoryValidators = require("../../../modules/inventory/routes/validators");
const invoiceValidators = require("../../../modules/invoices/routes/invoice.validator");
const jobOrderValidators = require("../../../modules/job-orders/routes/jobOrder.validator");
const posValidators = require("../../../modules/pos/routes/validators");
const productionValidators = require("../../../modules/production/routes/production.validator");
const publicValidators = require("../../../modules/public/routes/validators");
const settlementValidators = require("../../../modules/settlements/routes/settlement.validator");
const slaValidators = require("../../../modules/sla/routes/sla.validator");

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
  ...productionValidators,
  ...publicValidators,
  ...settlementValidators,
  ...slaValidators,
};
