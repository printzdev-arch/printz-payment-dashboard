const approvalService = require("../../../application/services/common/approval.service");

class ApprovalHelper {
  /**
   * Reusable helper to submit an approval request for any module.
   */
  static async requestApproval({
    referenceType,
    referenceId,
    requestedBy,
    branchId = null,
    comments = null,
  }) {
    return approvalService.createApproval({
      referenceType,
      referenceId,
      requestedBy,
      branchId,
      comments,
    });
  }

  /**
   * Helper to fetch approval status for a reference document.
   */
  static async getApprovalForReference(referenceType, referenceId) {
    const approvalRepository = require("../../../infrastructure/database/mongoose/repositories/common/ApprovalRepository");
    return approvalRepository.findByReference(referenceType, referenceId);
  }
}

module.exports = ApprovalHelper;
