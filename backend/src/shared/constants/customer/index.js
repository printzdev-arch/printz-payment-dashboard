/**
 * Customer Constants
 */

const CUSTOMER_TYPES = Object.freeze({
  WALK_IN: "WALK_IN",
  B2B: "B2B",
  REGULAR: "REGULAR",
});

const CUSTOMER_STATUSES = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
});

module.exports = {
  CUSTOMER_TYPES,
  CUSTOMER_STATUSES,
};
