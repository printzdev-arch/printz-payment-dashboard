const { INVOICE_STATUS, INVOICE_TYPE } = require("../../../shared/constants/invoice");

class Invoice {
  constructor({
    id = null,
    invoiceNumber = null,
    invoiceType = INVOICE_TYPE.TAX_INVOICE,
    status = INVOICE_STATUS.DRAFT,
    jobOrderId = null,
    jobNo = "",
    customerId = null,
    customerSnapshot = {},
    branchId = null,
    branchSnapshot = {},
    estimateId = null,
    deliveryOrderId = null,
    invoiceDate = new Date(),
    dueDate = null,
    currency = "INR",
    items = [],
    subtotal = 0,
    discountTotal = 0,
    additionalChargesTotal = 0,
    taxableAmount = 0,
    cgstTotal = 0,
    sgstTotal = 0,
    igstTotal = 0,
    taxTotal = 0,
    grandTotal = 0,
    advanceApplied = 0,
    paidAmount = 0,
    creditAdjustedAmount = 0,
    balanceDue = 0,
    estimateAmountSnapshot = 0,
    varianceAmount = 0,
    variancePercentage = 0,
    approvalRequired = false,
    approvalId = null,
    approvedBy = null,
    approvedAt = null,
    approvalRemarks = null,
    createdBy = null,
    updatedBy = null,
    finalizedBy = null,
    finalizedAt = null,
    remarks = "",
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id;
    this.invoiceNumber = invoiceNumber;
    this.invoiceType = invoiceType;
    this.status = status;
    this.jobOrderId = jobOrderId;
    this.jobNo = jobNo;
    this.customerId = customerId;
    this.customerSnapshot = customerSnapshot;
    this.branchId = branchId;
    this.branchSnapshot = branchSnapshot;
    this.estimateId = estimateId;
    this.deliveryOrderId = deliveryOrderId;
    this.invoiceDate = invoiceDate;
    this.dueDate = dueDate;
    this.currency = currency;
    this.items = items;
    this.subtotal = Number(subtotal) || 0;
    this.discountTotal = Number(discountTotal) || 0;
    this.additionalChargesTotal = Number(additionalChargesTotal) || 0;
    this.taxableAmount = Number(taxableAmount) || 0;
    this.cgstTotal = Number(cgstTotal) || 0;
    this.sgstTotal = Number(sgstTotal) || 0;
    this.igstTotal = Number(igstTotal) || 0;
    this.taxTotal = Number(taxTotal) || 0;
    this.grandTotal = Number(grandTotal) || 0;
    this.advanceApplied = Number(advanceApplied) || 0;
    this.paidAmount = Number(paidAmount) || 0;
    this.creditAdjustedAmount = Number(creditAdjustedAmount) || 0;
    this.balanceDue = Number(balanceDue) || 0;
    this.estimateAmountSnapshot = Number(estimateAmountSnapshot) || 0;
    this.varianceAmount = Number(varianceAmount) || 0;
    this.variancePercentage = Number(variancePercentage) || 0;
    this.approvalRequired = Boolean(approvalRequired);
    this.approvalId = approvalId;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt;
    this.approvalRemarks = approvalRemarks;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.finalizedBy = finalizedBy;
    this.finalizedAt = finalizedAt;
    this.remarks = remarks;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isDraft() {
    return this.status === INVOICE_STATUS.DRAFT;
  }

  isFinalized() {
    return [
      INVOICE_STATUS.FINALIZED,
      INVOICE_STATUS.PARTIALLY_PAID,
      INVOICE_STATUS.PAID,
    ].includes(this.status);
  }
}

module.exports = Invoice;
