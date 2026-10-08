/**
 * JobOrder Domain Entity
 */
class JobOrder {
  static STAGES = {
    DRAFT: "DRAFT",
    DESIGN: "DESIGN",
    SAMPLE_APPROVAL: "SAMPLE_APPROVAL",
    PLANNED: "PLANNED",
    PRINTING: "PRINTING",
    FINISHING: "FINISHING",
    PACKING: "PACKING",
    QC: "QC",
    REWORK: "REWORK",
    REPRINT: "REPRINT",
    READY: "READY",
    DELIVERY: "DELIVERY",
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
    jobNo = "",
    branchId = null,
    customerId = null,
    customerName = "Walk-in Customer",
    customerPhone = "",
    title = "Print Job",
    stage = "SAMPLE_APPROVAL",
    status = "ACTIVE",
    priority = "NORMAL",
    dueDate = null,
    items = [],
    totalAmount = 0,
    notes = "",
    createdBy = null,
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.jobNo = jobNo;
    this.branchId = branchId;
    this.customerId = customerId;
    this.customerName = customerName;
    this.customerPhone = customerPhone;
    this.title = title;
    this.stage = stage;
    this.status = status;
    this.priority = priority;
    this.dueDate = dueDate;
    this.items = Array.isArray(items) ? items : [];
    this.totalAmount = Number(totalAmount) || 0;
    this.notes = notes;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = JobOrder;
