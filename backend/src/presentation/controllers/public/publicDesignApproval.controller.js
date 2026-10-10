const PublicDesignApprovalService = require("../../../application/services/public/publicDesignApproval.service");
const { PublicApprovalDecisionDto } = require("../../../application/dto/public/PublicDesignApprovalDto");
const { asyncHandler, ResponseHelper } = require("../../../shared");

/**
 * Public endpoint to fetch safe design sample preview
 */
const getPreview = asyncHandler(async (req, res) => {
  const result = await PublicDesignApprovalService.getPreview(req.params.token);
  return ResponseHelper.success(
    res,
    result,
    "Design sample preview retrieved successfully"
  );
});

/**
 * Public endpoint to safely stream sample artwork
 */
const getArtwork = asyncHandler(async (req, res) => {
  const { filePath, mimeType } = await PublicDesignApprovalService.getArtworkFile(
    req.params.token
  );
  res.setHeader("Content-Type", mimeType || "image/png");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.sendFile(filePath);
});

/**
 * Public endpoint to record customer approval / revision decision
 */
const submitDecision = asyncHandler(async (req, res) => {
  const decisionDto = PublicApprovalDecisionDto.fromRequest(req);
  const result = await PublicDesignApprovalService.processDecision(
    req.params.token,
    decisionDto,
    {
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "",
    }
  );

  return ResponseHelper.success(res, result, result.message);
});

module.exports = {
  getPreview,
  getArtwork,
  submitDecision,
};
