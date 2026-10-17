/**
 * POS Module Data Transfer Objects (DTOs)
 * Covers: SaleReceipt, SaleReceiptItem, SalePayment
 */

class CreateSaleReceiptDto {
  constructor(data = {}) {
    this.branchId = data.branchId;
    this.customer = {
      name: data.customer?.name || "Walk-in Customer",
      mobile: data.customer?.mobile || null,
      email: data.customer?.email || null,
      address: data.customer?.address || null,
      gstin: data.customer?.gstin || null,
    };
    this.items = Array.isArray(data.items)
      ? data.items.map((it) => ({
          itemId: it.itemId || null,
          itemCode: it.itemCode || null,
          itemName: it.itemName,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discountAmount: Number(it.discountAmount) || 0,
          taxRate: Number(it.taxRate) || 0,
          unit: it.unit || "PCS",
          isStockTracked: it.isStockTracked !== undefined ? Boolean(it.isStockTracked) : true,
          notes: it.notes || null,
        }))
      : [];
    this.payments = Array.isArray(data.payments)
      ? data.payments.map((p) => ({
          mode: typeof p.mode === "string" ? p.mode.toUpperCase() : "CASH",
          amount: Number(p.amount) || 0,
          reference: p.reference || null,
          collectedAt: p.collectedAt ? new Date(p.collectedAt) : new Date(),
        }))
      : [];
    this.discountAmount = Number(data.discountAmount) || 0;
    this.notes = data.notes || null;
    this.idempotencyKey = data.idempotencyKey || null;
    this.cashierId = data.cashierId;
  }

  static fromRequest(req) {
    return new CreateSaleReceiptDto({
      ...req.body,
      cashierId: req.user?._id || req.user?.id,
    });
  }
}

class RecordSalePaymentDto {
  constructor(data = {}) {
    this.amount = Number(data.amount);
    this.paymentMode = typeof data.paymentMode === "string" ? data.paymentMode.toUpperCase() : "CASH";
    this.paymentReference = data.paymentReference || null;
    this.collectedBy = data.collectedBy;
  }

  static fromRequest(req) {
    return new RecordSalePaymentDto({
      ...req.body,
      collectedBy: req.user?._id || req.user?.id,
    });
  }
}

class VoidSaleReceiptDto {
  constructor(data = {}) {
    this.reason = typeof data.reason === "string" ? data.reason.trim() : "";
    this.voidedBy = data.voidedBy;
  }

  static fromRequest(req) {
    return new VoidSaleReceiptDto({
      ...req.body,
      voidedBy: req.user?._id || req.user?.id,
    });
  }
}

module.exports = {
  CreateSaleReceiptDto,
  RecordSalePaymentDto,
  VoidSaleReceiptDto,
};
