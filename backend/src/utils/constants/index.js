/**
 * Centralized Shared Constants Barrel Export
 * Organizes all 9 Core Modules cleanly
 */

const auth = require("../../modules/auth/models/constants");
const common = require("../../modules/general/models/constants");
const customer = require("../../modules/customers/models/constants");
const inventory = require("../../modules/inventory/models/constants");
const pos = require("../../modules/pos/models/constants");
const jobOrder = require("../../modules/job-orders/models/constants");
const design = require("../../modules/design/models/constants");
const production = require("../../modules/production/models/constants");
const sla = require("../../modules/sla/models/constants");

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
