/**
 * API 06 - Job Order & Workflow Stage Constants
 */

const jobStages = require("./jobStages");
const jobTransitions = require("./jobTransitions");

const JOB_PRIORITIES = {
  NORMAL: "NORMAL",
  URGENT: "URGENT",
  LOW: "LOW",
  HIGH: "HIGH",
};

const JOB_STATUSES = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

module.exports = {
  ...jobStages,
  ...jobTransitions,
  JOB_PRIORITIES,
  JOB_STATUSES,
};
