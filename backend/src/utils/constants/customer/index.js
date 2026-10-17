/**
 * Customer Constants
 */

const CUSTOMER_TYPES = Object.freeze({
  WALK_IN: "WALK_IN",
  QR: "QR",
  B2B: "B2B",
  REGULAR: "REGULAR",
});

const CUSTOMER_SOURCES = Object.freeze({
  INDIVIDUAL: "INDIVIDUAL",
  COMPANY: "COMPANY",
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
