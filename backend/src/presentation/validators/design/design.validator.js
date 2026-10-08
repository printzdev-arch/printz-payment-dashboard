const { body } = require("express-validator");
const { validate } = require("../auth.validator");

const assignValidator = [
  validate,
];

const reassignValidator = [
  body("target").notEmpty().withMessage("target designer or ROUND_ROBIN is required"),
  validate,
];

const rejectAssignmentValidator = [
  validate,
];

const sampleDecisionValidator = [
  body("decision").notEmpty().withMessage("decision (APPROVED or REVISION_REQUIRED) is required"),
  validate,
];

module.exports = {
  assignValidator,
  reassignValidator,
  rejectAssignmentValidator,
  sampleDecisionValidator,
};
