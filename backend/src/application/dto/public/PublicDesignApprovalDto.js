/**
 * Public Design Approval DTOs
 */

class PublicApprovalDecisionDto {
  constructor(data = {}) {
    const rawDecision = typeof data.decision === "string" ? data.decision.trim().toUpperCase() : "";
    this.decision = rawDecision;
    this.feedback = (data.feedback || data.comments || data.reason || data.customerFeedback || "").trim();
  }

  static fromRequest(req) {
    return new PublicApprovalDecisionDto(req.body || {});
  }
}

module.exports = {
  PublicApprovalDecisionDto,
};
