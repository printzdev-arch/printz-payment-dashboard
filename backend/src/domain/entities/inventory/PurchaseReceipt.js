/**
 * PurchaseReceipt Domain Entity
 * Supplier material receipt record.
 */
class PurchaseReceipt {
  static get STATUS() {
    return Object.freeze({
      DRAFT: "DRAFT",
      POSTED: "POSTED",
      CANCELLED: "CANCELLED",
    });
  }

  constructor({
    id,
    _id,
    receiptNo,
    branchId,
    supplierName,
    supplierInvoiceNo = null,
    receivedDate = new Date(),
    items = [],
    totalAmount = 0,
    status = "DRAFT",
    remarks = null,
    createdBy,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.receiptNo = receiptNo;
    this.branchId = branchId;
    this.supplierName = supplierName;
    this.supplierInvoiceNo = supplierInvoiceNo;
    this.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
    this.items = (items || []).map((item) => ({
      itemId: item.itemId,
      quantity: Number(item.quantity) || 0,
      purchaseRate: Number(item.purchaseRate) || 0,
      amount: Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.purchaseRate) || 0),
    }));
    this.totalAmount = Number(totalAmount) || this.items.reduce((sum, item) => sum + item.amount, 0);
    this.status = status || "DRAFT"; // "DRAFT" | "POSTED" | "CANCELLED"
    this.remarks = remarks;
    this.createdBy = createdBy;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  isDraft() {
    return this.status === "DRAFT";
  }

  isPosted() {
    return this.status === "POSTED";
  }

  isCancelled() {
    return this.status === "CANCELLED";
  }
}

module.exports = PurchaseReceipt;
