/**
 * ProductionOrder Domain Entity
 */
class ProductionOrder {
  static STATUSES = {
    PLANNED: "PLANNED",
    IN_PROGRESS: "IN_PROGRESS",
    ON_HOLD: "ON_HOLD",
    QC: "QC",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };

  static PRIORITIES = {
    LOW: "LOW",
    NORMAL: "NORMAL",
    HIGH: "HIGH",
    URGENT: "URGENT",
  };

  constructor({
    id,
    _id,
    productionNo = "",
    jobOrderId = null,
    jobItemId = null,
    branchId = null,
    status = "PLANNED",
    priority = "NORMAL",
    plannedQty = 0,
    actualQty = 0,
    plannedStart = null,
    actualStart = null,
    actualEnd = null,
    machineId = null,
    assignedEmployeeIds = [],
    approvedSample = null,
    cycleNo = 0,
    cycleType = "ORIGINAL",
    parentProductionOrderId = null,
    reprintRequestId = null,
    notes = "",
    holdReason = null,
    cancelReason = null,
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.productionNo = productionNo;
    this.jobOrderId = jobOrderId;
    this.jobItemId = jobItemId;
    this.branchId = branchId;
    this.status = status;
    this.priority = priority;
    this.plannedQty = Number(plannedQty) || 0;
    this.actualQty = Number(actualQty) || 0;
    this.plannedStart = plannedStart;
    this.actualStart = actualStart;
    this.actualEnd = actualEnd;
    this.machineId = machineId;
    this.assignedEmployeeIds = Array.isArray(assignedEmployeeIds) ? assignedEmployeeIds : [];
    this.approvedSample = approvedSample || {
      fileUrl: null,
      thumbnailUrl: null,
      customerComments: "",
      approvedAt: null,
    };
    this.cycleNo = Number(cycleNo) || 0;
    this.cycleType = cycleType || "ORIGINAL";
    this.parentProductionOrderId = parentProductionOrderId;
    this.reprintRequestId = reprintRequestId;
    this.notes = notes;
    this.holdReason = holdReason;
    this.cancelReason = cancelReason;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = ProductionOrder;
