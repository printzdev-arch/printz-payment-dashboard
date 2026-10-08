class JobOrder {
  constructor({
    id = null,
    jobNo,
    customerId = null,
    customerSnapshot = null,
    customerName = "Walk-in Customer",
    customerPhone = "",
    branchId,
    orderDate = new Date(),
    dueDate = null,
    completionDate = null,
    priority = "NORMAL",
    jobType = "PRINT_JOB",
    quantity = 1,
    customerRequirements = "",
    remarks = "",
    status = "DRAFT",
    currentStage = "ENQUIRY",
    estimationStatus = null,
    paymentStatus = "PENDING",
    designerId = null,
    assignedAt = null,
    subtotal = 0,
    discountAmount = 0,
    taxAmount = 0,
    grandTotal = 0,
    estimatedPrice = 0,
    totalAmount = 0,
    items = [],
    createdBy = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.jobNo = jobNo;
    this.customerId = customerId;
    this.customerSnapshot = customerSnapshot;
    this.customerName = customerName;
    this.customerPhone = customerPhone;
    this.branchId = branchId;
    this.orderDate = orderDate;
    this.dueDate = dueDate;
    this.completionDate = completionDate;
    this.priority = priority;
    this.jobType = jobType;
    this.quantity = quantity;
    this.customerRequirements = customerRequirements;
    this.remarks = remarks;
    this.status = status;
    this.currentStage = currentStage;
    this.estimationStatus = estimationStatus;
    this.paymentStatus = paymentStatus;
    this.designerId = designerId;
    this.assignedAt = assignedAt;
    this.subtotal = subtotal;
    this.discountAmount = discountAmount;
    this.taxAmount = taxAmount;
    this.grandTotal = grandTotal;
    this.estimatedPrice = estimatedPrice;
    this.totalAmount = totalAmount || grandTotal;
    this.items = items;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = JobOrder;
