/**
 * Request Validation Middleware Index
 */
const authValidators = require("../../modules/auth/validators");
const commonValidators = require("./common");
const customerValidators = require("../../modules/customers/validators/customer.validator");
const deliveryValidators = require("../../modules/delivery/validators/delivery.validator");
const designValidators = require("../../modules/design/validators/design.validator");
const inventoryValidators = require("../../modules/inventory/validators");
const invoiceValidators = require("../../modules/invoices/validators/invoice.validator");
const jobOrderValidators = require("../../modules/job-orders/validators/jobOrder.validator");
const posValidators = require("../../modules/pos/validators");
const productionValidators = require("../../modules/production/validators/production.validator");
const publicValidators = require("../../modules/public/validators");
const settlementValidators = require("../../modules/settlements/validators/settlement.validator");
const slaValidators = require("../../modules/sla/validators/sla.validator");

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
