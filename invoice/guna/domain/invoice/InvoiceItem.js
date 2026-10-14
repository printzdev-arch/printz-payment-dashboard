class InvoiceItem {
  constructor({
    jobOrderItemId = null,
    estimateItemId = null,
    itemId = null,
    itemCode = "",
    itemName = "",
    description = "",
    unit = "PCS",
    quantity = 1,
    unitPrice = 0,
    discountType = "FIXED",
    discountValue = 0,
    discountAmount = 0,
    taxRate = 0,
    taxableAmount = 0,
    cgstAmount = 0,
    sgstAmount = 0,
    igstAmount = 0,
    taxAmount = 0,
    lineTotal = 0,
  } = {}) {
    this.jobOrderItemId = jobOrderItemId;
    this.estimateItemId = estimateItemId;
    this.itemId = itemId;
    this.itemCode = itemCode;
    this.itemName = itemName;
    this.description = description;
    this.unit = unit;
    this.quantity = Number(quantity) || 0;
    this.unitPrice = Number(unitPrice) || 0;
    this.discountType = discountType;
    this.discountValue = Number(discountValue) || 0;
    this.discountAmount = Number(discountAmount) || 0;
    this.taxRate = Number(taxRate) || 0;
    this.taxableAmount = Number(taxableAmount) || 0;
    this.cgstAmount = Number(cgstAmount) || 0;
    this.sgstAmount = Number(sgstAmount) || 0;
    this.igstAmount = Number(igstAmount) || 0;
    this.taxAmount = Number(taxAmount) || 0;
    this.lineTotal = Number(lineTotal) || 0;
  }
}

module.exports = InvoiceItem;
