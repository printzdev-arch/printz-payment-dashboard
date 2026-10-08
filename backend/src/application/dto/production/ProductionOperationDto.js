/**
 * Production Operation Data Transfer Objects
 */
class StartOperationDto {
  constructor({ machineId = null, inputQty = null } = {}) {
    this.machineId = machineId;
    this.inputQty = inputQty !== null ? Number(inputQty) : null;
  }

  static fromRequest(req) {
    return new StartOperationDto(req.body || {});
  }
}

class CompleteOperationDto {
  constructor({ outputQty, completedQty, remarks = "", consumption = [] } = {}) {
    if (outputQty !== undefined) this.outputQty = Number(outputQty);
    if (completedQty !== undefined) this.completedQty = Number(completedQty);
    this.remarks = typeof remarks === "string" ? remarks.trim() : "";
    this.consumption = Array.isArray(consumption) ? consumption : [];
  }

  static fromRequest(req) {
    return new CompleteOperationDto(req.body || {});
  }
}

class ProductionOperationResponseDto {
  constructor(entity) {
    if (!entity) return;
    const rawId = entity._id || entity.id;
    this._id = rawId ? (rawId.toString ? rawId.toString() : rawId) : rawId;
    this.productionOrderId = entity.productionOrderId || null;
    this.jobOrderId = entity.jobOrderId || null;
    this.branchId = entity.branchId || null;
    this.operationCode = entity.operationCode || "";
    this.operationName = entity.operationName || "";
    this.sequenceNo = typeof entity.sequenceNo === "number" ? entity.sequenceNo : 1;
    this.machineId = entity.machineId || null;
    this.assignedEmployeeId = entity.assignedEmployeeId || null;
    this.plannedQty = typeof entity.plannedQty === "number" ? entity.plannedQty : 0;
    this.inputQty = typeof entity.inputQty === "number" ? entity.inputQty : 0;
    this.outputQty = typeof entity.outputQty === "number" ? entity.outputQty : 0;
    this.completedQty = typeof entity.completedQty === "number" ? entity.completedQty : 0;
    this.status = entity.status || "PENDING";
    this.startAt = entity.startAt || null;
    this.endAt = entity.endAt || null;
    this.remarks = entity.remarks || "";
    this.isRework = Boolean(entity.isRework);
    this.isReprint = Boolean(entity.isReprint);
    this.cycleNo = typeof entity.cycleNo === "number" ? entity.cycleNo : 0;
    this.cycleType = entity.cycleType || "ORIGINAL";
    this.consumptionRecords = Array.isArray(entity.consumptionRecords) ? entity.consumptionRecords : [];
    this.createdAt = entity.createdAt || null;
    this.updatedAt = entity.updatedAt || null;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new ProductionOperationResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new ProductionOperationResponseDto(e));
  }
}

module.exports = {
  StartOperationDto,
  CompleteOperationDto,
  ProductionOperationResponseDto,
};
