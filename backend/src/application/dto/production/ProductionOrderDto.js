const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

/**
 * Production Order Data Transfer Objects
 */
class PlanProductionDto {
  constructor({ plannedStart, machineId, assignedEmployeeIds = [], notes = "" } = {}) {
    this.plannedStart = plannedStart ? new Date(plannedStart) : new Date();
    this.machineId = machineId || null;
    this.assignedEmployeeIds = Array.isArray(assignedEmployeeIds) ? assignedEmployeeIds : [];
    this.notes = typeof notes === "string" ? notes.trim() : "";
  }

  static fromRequest(req) {
    return new PlanProductionDto(req.body || {});
  }
}

class UpdateProductionOrderDto {
  constructor(data = {}) {
    if (data.plannedStart !== undefined) this.plannedStart = new Date(data.plannedStart);
    if (data.machineId !== undefined) this.machineId = data.machineId;
    if (data.assignedEmployeeIds !== undefined) {
      this.assignedEmployeeIds = Array.isArray(data.assignedEmployeeIds) ? data.assignedEmployeeIds : [];
    }
    if (data.priority !== undefined) this.priority = String(data.priority).toUpperCase().trim();
    if (data.notes !== undefined) this.notes = String(data.notes).trim();
  }

  static fromRequest(req) {
    return new UpdateProductionOrderDto(req.body || {});
  }
}

class ProductionOrderResponseDto {
  constructor(entity) {
    if (!entity) return;
    const rawId = entity._id || entity.id;
    this._id = rawId ? (rawId.toString ? rawId.toString() : rawId) : rawId;
    this.productionNo = entity.productionNo || "";
    this.jobOrderId = entity.jobOrderId || null;
    this.jobItemId = entity.jobItemId || null;
    this.branchId = entity.branchId || null;
    this.status = entity.status || "PLANNED";
    this.priority = entity.priority || "NORMAL";
    this.plannedQty = typeof entity.plannedQty === "number" ? entity.plannedQty : 0;
    this.actualQty = typeof entity.actualQty === "number" ? entity.actualQty : 0;
    this.plannedStart = entity.plannedStart || null;
    this.actualStart = entity.actualStart || null;
    this.actualEnd = entity.actualEnd || null;
    this.machineId = entity.machineId || null;
    this.assignedEmployeeIds = Array.isArray(entity.assignedEmployeeIds) ? entity.assignedEmployeeIds : [];
    this.approvedSample = entity.approvedSample || null;
    this.cycleNo = typeof entity.cycleNo === "number" ? entity.cycleNo : 0;
    this.cycleType = entity.cycleType || "ORIGINAL";
    this.parentProductionOrderId = entity.parentProductionOrderId || null;
    this.reprintRequestId = entity.reprintRequestId || null;
    this.notes = entity.notes || "";
    this.operations = Array.isArray(entity.operations) ? entity.operations : [];
    this.qualityChecks = Array.isArray(entity.qualityChecks) ? entity.qualityChecks : [];
    this.createdAt = entity.createdAt || null;
    this.updatedAt = entity.updatedAt || null;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new ProductionOrderResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new ProductionOrderResponseDto(e));
  }
}

module.exports = {
  PlanProductionDto,
  UpdateProductionOrderDto,
  ProductionOrderResponseDto,
};
