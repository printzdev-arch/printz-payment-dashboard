/**
 * API 07 - Design Queue & Sample Approval Constants
 */

const designConstants = require("./designConstants");

const ASSIGNMENT_STATUS = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  REASSIGNED: "REASSIGNED",
  REJECTED: "REJECTED",
};

const SAMPLE_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REVISION_REQUIRED: "REVISION_REQUIRED",
};

const ASSIGNMENT_METHODS = {
  ROUND_ROBIN: "ROUND_ROBIN",
  MANUAL: "MANUAL",
  REASSIGN: "REASSIGN",
};

module.exports = {
  ...designConstants,
  ASSIGNMENT_STATUS,
  SAMPLE_STATUS,
  ASSIGNMENT_METHODS,
};
