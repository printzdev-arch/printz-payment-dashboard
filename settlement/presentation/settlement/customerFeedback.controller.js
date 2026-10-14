const CustomerFeedbackService = require("../../../application/services/settlement/customerFeedback.service");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const asyncHandler = require("../../../shared/asyncHandler");

class CustomerFeedbackController {
  static submitFeedback = asyncHandler(async (req, res) => {
    const result = await CustomerFeedbackService.submitFeedback(req.params.id, req.body, req.user);
    return ResponseHelper.created(res, result, "Customer feedback and rating submitted successfully");
  });

  static getJobFeedback = asyncHandler(async (req, res) => {
    const result = await CustomerFeedbackService.getJobFeedback(req.params.id);
    return ResponseHelper.ok(res, "Job feedback retrieved successfully", result);
  });

  static getDesignerRatingsSummary = asyncHandler(async (req, res) => {
    const result = await CustomerFeedbackService.getDesignerRatingsSummary(req.query);
    return ResponseHelper.ok(res, "Designer ratings summary retrieved successfully", result);
  });
}

module.exports = CustomerFeedbackController;
