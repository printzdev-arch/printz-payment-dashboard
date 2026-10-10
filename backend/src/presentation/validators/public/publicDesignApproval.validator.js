const { body } = require("express-validator");
const { validate } = require("../auth.validator");

const publicApprovalDecisionValidator = [
  body("decision")
    .notEmpty()
    .withMessage("decision is required.")
    .custom((val) => {
      const upper = String(val).trim().toUpperCase();
      if (!["APPROVED", "REVISION_REQUIRED"].includes(upper)) {
        throw new Error("decision must be either 'APPROVED' or 'REVISION_REQUIRED'.");
      }
      return true;
    }),

  body().custom((reqBody) => {
    const dec = String(reqBody?.decision || "").trim().toUpperCase();
    const feedback = reqBody?.feedback || reqBody?.comments || reqBody?.reason || reqBody?.customerFeedback;
    if (dec === "REVISION_REQUIRED" && (!feedback || !String(feedback).trim())) {
      throw new Error("Feedback / comments are required when requesting revisions.");
    }
    return true;
  }),

  validate,
];

module.exports = {
  publicApprovalDecisionValidator,
};
