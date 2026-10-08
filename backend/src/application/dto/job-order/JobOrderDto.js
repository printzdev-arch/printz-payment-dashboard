/**
 * Job Order DTOs (Module 06)
 */

class CreateJobDto {
  constructor(data = {}) {
    this.customerId = data.customerId || null;
    this.customerName = data.customerName || "Walk-in Customer";
    this.customerPhone = data.customerPhone || "";
    this.branchId = data.branchId;
    this.orderDate = data.orderDate ? new Date(data.orderDate) : new Date();
    this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    this.priority = data.priority || "NORMAL";
    this.jobType = data.jobType || "PRINT_JOB";
    this.quantity = Number(data.quantity) || 1;
    this.customerRequirements = data.customerRequirements || "";
    this.remarks = data.remarks || "";
    this.discountAmount = Number(data.discountAmount) || 0;
    this.items = Array.isArray(data.items) ? data.items : [];
    this.draft = Boolean(data.draft);
    this.submitForEstimateApproval = Boolean(data.submitForEstimateApproval);
  }
}

class UpdateJobDto {
  constructor(data = {}) {
    if (data.dueDate !== undefined) this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.completionDate !== undefined) this.completionDate = data.completionDate ? new Date(data.completionDate) : null;
    if (data.priority !== undefined) this.priority = data.priority;
    if (data.quantity !== undefined) this.quantity = Number(data.quantity);
    if (data.remarks !== undefined) this.remarks = data.remarks;
    if (data.customerRequirements !== undefined) this.customerRequirements = data.customerRequirements;
    if (data.notes !== undefined) this.notes = data.notes;
  }
}

class ReplaceItemsDto {
  constructor(data = {}) {
    this.items = Array.isArray(data.items) ? data.items : [];
    this.discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : undefined;
  }
}

class ListJobsQueryDto {
  constructor(query = {}) {
    this.branchId = query.branchId;
    this.customerId = query.customerId;
    this.designerId = query.designerId;
    this.jobType = query.jobType;
    this.priority = query.priority;
    this.paymentStatus = query.paymentStatus;
    this.status = query.status;
    this.currentStage = query.currentStage;
    this.from = query.from;
    this.to = query.to;
    this.dueFrom = query.dueFrom;
    this.dueTo = query.dueTo;
    this.overdue = query.overdue;
    this.q = query.q || query.search;
    this.page = parseInt(query.page, 10) || 1;
    this.limit = parseInt(query.limit, 10) || 20;
  }
}

module.exports = {
  CreateJobDto,
  UpdateJobDto,
  ReplaceItemsDto,
  ListJobsQueryDto,
};
