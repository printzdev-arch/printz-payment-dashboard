/**
 * Centralized Shared Constants Barrel Export
 * Organizes all 9 Core Modules cleanly
 */

const auth = require("./auth");
const common = require("./common");
const inventory = require("./inventory");
const pos = require("./pos");
const productOrder = require("./product-order");
const jobOrder = require("./job-order");
const design = require("./design");
const production = require("./production");
const sla = require("./sla");

// Backward compatibility references
const permissions = require("./permissions");
const productOrderConstants = require("./productOrderConstants");

module.exports = {
  // 9 Modular Domains
  auth,
  common,
  inventory,
  pos,
  productOrder,
  jobOrder,
  design,
  production,
  sla,

  // Flattened accessors
  ...auth,
  ...common,
  ...inventory,
  ...pos,
  ...productOrder,
  ...jobOrder,
  ...design,
  ...production,
  ...sla,

  // Legacy mappings
  permissions,
  productOrderConstants,
};
