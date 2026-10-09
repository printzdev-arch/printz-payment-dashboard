/**
 * SaleReceipt Domain Entity
 * Represents a POS counter billing or order sale receipt.
 */
class SaleReceipt {
  constructor({
    id,
    _id,
    receiptNo,
    branchId,
    customerId = null,
    customerSnapshot = {},
    saleDate = new Date(),
    subtotal = 0,
    discountAmount = 0,
    taxAmount = 0,
    grandTotal = 0,
    paymentStatus = "UNPAID",
    paymentMode = "CASH",
    paymentReference = null,
    invoiceId = null,
    jobOrderId = null,
    status = "DRAFT",
    amountPaid = 0,
    remarks = null,
    idempotencyKey = null,
    createdBy,
    voidReason = null,
    voidedBy = null,
    voidedAt = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.receiptNo = receiptNo;
    this.branchId = branchId;
    this.customerId = customerId;
    this.customerSnapshot = customerSnapshot || {};
    this.saleDate = saleDate ? new Date(saleDate) : new Date();
    this.subtotal = Number(subtotal) || 0;
    this.discountAmount = Number(discountAmount) || 0;
    this.taxAmount = Number(taxAmount) || 0;
    this.grandTotal = Number(grandTotal) || 0;
    this.paymentStatus = paymentStatus; // UNPAID | PARTIAL | PAID | CREDIT
    this.paymentMode = paymentMode; // CASH | UPI | CARD | BANK | CREDIT | null
    this.paymentReference = paymentReference;
    this.invoiceId = invoiceId;
    this.jobOrderId = jobOrderId;
    this.status = status; // DRAFT | COMPLETED | VOID
    this.amountPaid = Number(amountPaid) || 0;
    this.remarks = remarks;
    this.idempotencyKey = idempotencyKey;
    this.createdBy = createdBy;
    this.voidReason = voidReason;
    this.voidedBy = voidedBy;
    this.voidedAt = voidedAt ? new Date(voidedAt) : null;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }
}

module.exports = SaleReceipt;
