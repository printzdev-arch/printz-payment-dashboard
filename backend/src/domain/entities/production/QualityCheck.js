/**
 * QualityCheck Domain Entity
 */
class QualityCheck {
  static RESULTS = {
    PASS: "PASS",
    ISSUE: "ISSUE",
    FAIL: "FAIL",
    CONDITIONAL: "CONDITIONAL",
  };

  static CORRECTIVE_ACTIONS = {
    REWORK: "REWORK",
    REPRINT: "REPRINT",
    NONE: "NONE",
  };

  constructor({
    id,
    _id,
    productionOrderId = null,
    jobOrderId = null,
    jobItemId = null,
    operationId = null,
    checkType = "FINAL",
    checkedBy = null,
    checkedAt = null,
    result = "PASS",
    quantityChecked = 0,
    acceptedQty = 0,
    rejectedQty = 0,
    defects = [],
    issueDetails = "",
    correctiveAction = null,
    reprintRequestId = null,
    reworkOperationCode = null,
    restartFromOperationCode = null,
    comments = "",
    checklist = [],
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.productionOrderId = productionOrderId;
    this.jobOrderId = jobOrderId;
    this.jobItemId = jobItemId;
    this.operationId = operationId;
    this.checkType = checkType;
    this.checkedBy = checkedBy;
    this.checkedAt = checkedAt || new Date();
    this.result = result;
    this.quantityChecked = Number(quantityChecked) || 0;
    this.acceptedQty = Number(acceptedQty) || 0;
    this.rejectedQty = Number(rejectedQty) || 0;
    this.defects = Array.isArray(defects) ? defects : [];
    this.issueDetails = issueDetails;
    this.correctiveAction = correctiveAction;
    this.reprintRequestId = reprintRequestId;
    this.reworkOperationCode = reworkOperationCode;
    this.restartFromOperationCode = restartFromOperationCode;
    this.comments = comments;
    this.checklist = Array.isArray(checklist) ? checklist : [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = QualityCheck;
