/**
 * Reprint Request Data Transfer Objects
 */
class CreateReprintRequestDto {
  constructor({
    jobItemId = null,
    productionOrderId = null,
    reason = "",
    quantity = 1,
    sourceStage = "QC",
    restartFromOperationCode = "PRINT",
    cycleNo = 1,
    details = "",
    attachments = [],
    markAsUrgent = false,
  } = {}) {
    this.jobItemId = jobItemId;
    this.productionOrderId = productionOrderId;
    this.reason = typeof reason === "string" ? reason.trim() : "";
    this.quantity = Number(quantity) || 1;
    this.sourceStage = sourceStage;
    this.restartFromOperationCode = restartFromOperationCode || "PRINT";
    this.cycleNo = Number(cycleNo) || 1;
    this.details = typeof details === "string" ? details.trim() : "";
    this.attachments = Array.isArray(attachments) ? attachments : [];
    this.markAsUrgent = Boolean(markAsUrgent);
  }

  static fromRequest(req) {
    return new CreateReprintRequestDto(req.body || {});
  }
}

class ReprintRequestResponseDto {
  constructor(entity) {
    if (!entity) return;
    const rawId = entity._id || entity.id;
    this._id = rawId ? (rawId.toString ? rawId.toString() : rawId) : rawId;
    this.jobOrderId = entity.jobOrderId || null;
    this.jobItemId = entity.jobItemId || null;
    this.productionOrderId = entity.productionOrderId || null;
    this.requestedBy = entity.requestedBy || null;
    this.reason = entity.reason || "";
    this.quantity = typeof entity.quantity === "number" ? entity.quantity : 1;
    this.sourceStage = entity.sourceStage || "QC";
    this.restartFromOperationCode = entity.restartFromOperationCode || "PRINT";
    this.cycleNo = typeof entity.cycleNo === "number" ? entity.cycleNo : 1;
    this.details = entity.details || "";
    this.attachments = Array.isArray(entity.attachments) ? entity.attachments : [];
    this.status = entity.status || "REQUESTED";
    this.approvedBy = entity.approvedBy || null;
    this.approvedAt = entity.approvedAt || null;
    this.markAsUrgent = Boolean(entity.markAsUrgent);
    this.managerComments = entity.managerComments || "";
    this.reopenedAt = entity.reopenedAt || null;
    this.completedAt = entity.completedAt || null;
    this.rejectionReason = entity.rejectionReason || null;
    this.createdAt = entity.createdAt || null;
    this.updatedAt = entity.updatedAt || null;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new ReprintRequestResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new ReprintRequestResponseDto(e));
  }
}

module.exports = {
  CreateReprintRequestDto,
  ReprintRequestResponseDto,
};
