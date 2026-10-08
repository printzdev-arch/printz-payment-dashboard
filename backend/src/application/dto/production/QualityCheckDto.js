/**
 * Quality Check Data Transfer Objects
 */
class PerformQualityCheckDto {
  constructor(data = {}) {
    this.checkType = data.checkType || "FINAL";
    this.result = data.result || "PASS";
    if (data.quantityChecked !== undefined) this.quantityChecked = Number(data.quantityChecked);
    if (data.acceptedQty !== undefined) this.acceptedQty = Number(data.acceptedQty);
    if (data.rejectedQty !== undefined) this.rejectedQty = Number(data.rejectedQty);
    this.defects = Array.isArray(data.defects) ? data.defects : [];
    this.issueDetails = data.issueDetails || "";
    this.correctiveAction = data.correctiveAction || null;
    this.reprintQuantity = data.reprintQuantity !== undefined ? Number(data.reprintQuantity) : null;
    this.reworkOperationCode = data.reworkOperationCode || "PRINT";
    this.restartFromOperationCode = data.restartFromOperationCode || "PRINT";
    this.comments = data.comments || "";
    this.checklist = Array.isArray(data.checklist) ? data.checklist : [];
  }

  static fromRequest(req) {
    return new PerformQualityCheckDto(req.body || {});
  }
}

class QualityCheckResponseDto {
  constructor(entity) {
    if (!entity) return;
    const rawId = entity._id || entity.id;
    this._id = rawId ? (rawId.toString ? rawId.toString() : rawId) : rawId;
    this.productionOrderId = entity.productionOrderId || null;
    this.jobOrderId = entity.jobOrderId || null;
    this.jobItemId = entity.jobItemId || null;
    this.operationId = entity.operationId || null;
    this.checkType = entity.checkType || "FINAL";
    this.checkedBy = entity.checkedBy || null;
    this.checkedAt = entity.checkedAt || null;
    this.result = entity.result || "PASS";
    this.quantityChecked = typeof entity.quantityChecked === "number" ? entity.quantityChecked : 0;
    this.acceptedQty = typeof entity.acceptedQty === "number" ? entity.acceptedQty : 0;
    this.rejectedQty = typeof entity.rejectedQty === "number" ? entity.rejectedQty : 0;
    this.defects = Array.isArray(entity.defects) ? entity.defects : [];
    this.issueDetails = entity.issueDetails || "";
    this.correctiveAction = entity.correctiveAction || null;
    this.reprintRequestId = entity.reprintRequestId || null;
    this.reworkOperationCode = entity.reworkOperationCode || null;
    this.restartFromOperationCode = entity.restartFromOperationCode || null;
    this.comments = entity.comments || "";
    this.checklist = Array.isArray(entity.checklist) ? entity.checklist : [];
    this.createdAt = entity.createdAt || null;
    this.updatedAt = entity.updatedAt || null;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new QualityCheckResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new QualityCheckResponseDto(e));
  }
}

module.exports = {
  PerformQualityCheckDto,
  QualityCheckResponseDto,
};
