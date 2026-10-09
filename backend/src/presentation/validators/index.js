/**
 * Centralized Presentation Request Validators Barrel Export (All 9 Modules)
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

module.exports = {
  auth,
  common,
  inventory,
  pos,
  productOrder,
  jobOrder,
  design,
  production,
  sla,

  // Flattened
  ...auth,
  ...common,
  ...inventory,
  ...pos,
  ...productOrder,
  ...jobOrder,
  ...design,
  ...production,
  ...sla,
};
