const { body } = require("express-validator");
const { validate } = require("../auth/auth.validator");

const assignValidator = [
  validate,
];

const reassignValidator = [
  body("target").notEmpty().withMessage("target designer or ROUND_ROBIN is required"),
  validate,
];

const rejectAssignmentValidator = [
  body().custom((val, { req }) => {
    const reason = (req.body?.reason || req.body?.rejectionReason || "").trim();
    if (!reason) {
      throw new Error("Rejection reason is required");
    }
    return true;
  }),
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
