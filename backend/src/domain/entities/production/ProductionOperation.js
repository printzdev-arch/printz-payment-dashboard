/**
 * ProductionOperation Domain Entity
 */
class ProductionOperation {
  static STATUSES = {
    PENDING: "PENDING",
    RUNNING: "RUNNING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    SKIPPED: "SKIPPED",
  };

  constructor({
    id,
    _id,
    productionOrderId = null,
    jobOrderId = null,
    branchId = null,
    operationCode = "",
    operationName = "",
    sequenceNo = 1,
    machineId = null,
    assignedEmployeeId = null,
    plannedQty = 0,
    inputQty = 0,
    outputQty = 0,
    completedQty = 0,
    status = "PENDING",
    startAt = null,
    endAt = null,
    remarks = "",
    isRework = false,
    isReprint = false,
    cycleNo = 0,
    cycleType = "ORIGINAL",
    consumptionRecords = [],
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.productionOrderId = productionOrderId;
    this.jobOrderId = jobOrderId;
    this.branchId = branchId;
    this.operationCode = operationCode;
    this.operationName = operationName;
    this.sequenceNo = Number(sequenceNo) || 1;
    this.machineId = machineId;
    this.assignedEmployeeId = assignedEmployeeId;
    this.plannedQty = Number(plannedQty) || 0;
    this.inputQty = Number(inputQty) || 0;
    this.outputQty = Number(outputQty) || 0;
    this.completedQty = Number(completedQty) || 0;
    this.status = status;
    this.startAt = startAt;
    this.endAt = endAt;
    this.remarks = remarks;
    this.isRework = Boolean(isRework);
    this.isReprint = Boolean(isReprint);
    this.cycleNo = Number(cycleNo) || 0;
    this.cycleType = cycleType || "ORIGINAL";
    this.consumptionRecords = Array.isArray(consumptionRecords) ? consumptionRecords : [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = ProductionOperation;
