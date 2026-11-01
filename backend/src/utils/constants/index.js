/**
 * Centralized Shared Constants Barrel Export
 * Organizes all 9 Core Modules cleanly
 */

const auth = require("../../modules/auth/constants");
const common = require("../../modules/general/constants");
const customer = require("../../modules/customers/constants");
const inventory = require("../../modules/inventory/constants");
const pos = require("../../modules/pos/constants");
const jobOrder = require("../../modules/job-orders/constants");
const design = require("../../modules/design/constants");
const production = require("../../modules/production/constants");
const sla = require("../../modules/sla/constants");

// Backward compatibility references
const permissions = require("./permissions");

module.exports = {
  // Modular Domains
  auth,
  common,
  customer,
  inventory,
  pos,
  jobOrder,
  design,
  production,
  sla,

  // Flattened accessors
  ...auth,
  ...common,
  ...customer,
  ...inventory,
  ...pos,
  ...jobOrder,
  ...design,
  ...production,
  ...sla,

  // Legacy mappings
  permissions,
};
