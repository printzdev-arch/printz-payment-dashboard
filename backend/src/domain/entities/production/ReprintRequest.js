/**
 * ReprintRequest Domain Entity
 */
class ReprintRequest {
  static STATUSES = {
    REQUESTED: "REQUESTED",
    APPROVED: "APPROVED",
    IN_PRODUCTION: "IN_PRODUCTION",
    COMPLETED: "COMPLETED",
    REJECTED: "REJECTED",
  };

  static SOURCE_STAGES = {
    PACKING: "PACKING",
    QC: "QC",
    FINISHING: "FINISHING",
    PRINTING: "PRINTING",
    DELIVERY: "DELIVERY",
  };

  constructor({
    id,
    _id,
    jobOrderId = null,
    jobItemId = null,
    productionOrderId = null,
    requestedBy = null,
    reason = "",
    quantity = 1,
    sourceStage = "QC",
    restartFromOperationCode = "PRINT",
    cycleNo = 1,
    details = "",
    attachments = [],
    status = "REQUESTED",
    approvedBy = null,
    approvedAt = null,
    markAsUrgent = false,
    managerComments = "",
    reopenedAt = null,
    completedAt = null,
    rejectionReason = null,
    activityRefs = [],
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.jobOrderId = jobOrderId;
    this.jobItemId = jobItemId;
    this.productionOrderId = productionOrderId;
    this.requestedBy = requestedBy;
    this.reason = reason;
    this.quantity = Number(quantity) || 1;
    this.sourceStage = sourceStage;
    this.restartFromOperationCode = restartFromOperationCode || "PRINT";
    this.cycleNo = Number(cycleNo) || 1;
    this.details = details || "";
    this.attachments = Array.isArray(attachments) ? attachments : [];
    this.status = status;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt;
    this.markAsUrgent = Boolean(markAsUrgent);
    this.managerComments = managerComments || "";
    this.reopenedAt = reopenedAt;
    this.completedAt = completedAt;
    this.rejectionReason = rejectionReason;
    this.activityRefs = Array.isArray(activityRefs) ? activityRefs : [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = ReprintRequest;
