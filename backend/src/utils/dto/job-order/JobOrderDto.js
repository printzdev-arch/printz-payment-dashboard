/**
 * Job Order DTOs (Module 06)
 */

const { sortFinishingServices, ensureStaticFinishingServices } = require("../../constants/job-order/finishingServices");

class CreateJobDto {
  constructor(data = {}) {
    this.customerId = data.customerId || null;
    this.customerName = data.customerName || data.customerSnapshot?.name || "Walk-in Customer";
    this.customerPhone = data.customerPhone || data.customerMobile || data.customerSnapshot?.mobile || "";
    this.customerMobile = this.customerPhone;
    this.customerEmail = data.customerEmail || data.customerSnapshot?.email || "";
    this.customerCompany = data.customerCompany || data.company || "";
    this.customerAddress = data.customerAddress || data.address || "";
    this.customerGstin = data.customerGstin || data.gstin || "";
    this.customerSnapshot = data.customerSnapshot || undefined;
    this.branchId = data.branchId;
    this.branchName = data.branchName || "";
    this.title = data.title || data.jobTitle || (Array.isArray(data.items) && data.items[0]?.itemName) || "Custom Print Order";
    this.jobTitle = this.title;
    this.orderDate = data.orderDate ? new Date(data.orderDate) : new Date();
    this.dueDate = data.dueDate ? new Date(data.dueDate) : data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null;
    this.expectedDeliveryDate = this.dueDate;
    this.priority = data.priority || "NORMAL";
    this.jobType = data.jobType || "PRINT_JOB";
    this.quantity = Number(data.quantity) || 1;
    this.customerRequirements = data.customerRequirements || data.notes || data.remarks || "";
    this.remarks = data.remarks || data.notes || "";
    this.notes = data.notes || data.remarks || "";
    this.specialInstructions = data.specialInstructions || "";
    this.deliveryMethod = data.deliveryMethod || "";
    this.referenceNo = data.referenceNo || "";
    this.discountAmount = Number(data.discountAmount) || 0;
    this.items = Array.isArray(data.items) ? data.items : [];
    this.specs = typeof data.specs === "object" && data.specs !== null ? data.specs : {};
    this.finishingServices = Array.isArray(data.finishingServices)
      ? ensureStaticFinishingServices(data.finishingServices, this.quantity)
      : (data.finishingServices ? ensureStaticFinishingServices([data.finishingServices], this.quantity) : ensureStaticFinishingServices([], this.quantity));
    this.additionalServices = Array.isArray(data.additionalServices) ? data.additionalServices : [];
    this.attachments = Array.isArray(data.attachments) ? data.attachments : [];
    this.advancePaid = Number(data.advancePaid) || 0;
    this.draft = Boolean(data.draft || data.status === "DRAFT");
    this.status = data.status || (this.draft ? "DRAFT" : "SUBMITTED");
    this.submitForEstimateApproval = Boolean(data.submitForEstimateApproval);
    this.idempotencyKey = data.idempotencyKey || null;
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
    if (data.finishingServices !== undefined) {
      this.finishingServices = Array.isArray(data.finishingServices)
        ? ensureStaticFinishingServices(data.finishingServices, this.quantity || data.quantity || 500)
        : [];
    }
    if (data.specs !== undefined) this.specs = data.specs;
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
