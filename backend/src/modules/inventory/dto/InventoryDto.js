/**
 * Inventory Module Data Transfer Objects (DTOs)
 * Covers: InventoryItem, InventoryTransaction, PurchaseReceipt, InventoryBalance
 */

class CreateInventoryItemDto {
  constructor(data = {}) {
    this.itemCode = typeof data.itemCode === "string" ? data.itemCode.trim().toUpperCase() : "";
    this.name = typeof data.name === "string" ? data.name.trim() : "";
    this.category = typeof data.category === "string" ? data.category.trim().toUpperCase() : "GENERAL";
    this.hsnCode = data.hsnCode || null;
    this.unit = typeof data.unit === "string" ? data.unit.trim().toUpperCase() : "PCS";
    this.purchaseRate = Number(data.purchaseRate) || 0;
    this.saleRate = Number(data.saleRate) || 0;
    this.taxRate = Number(data.taxRate) || 0;
    this.reorderLevel = Number(data.reorderLevel) || 0;
    this.isStockTracked = data.isStockTracked !== undefined ? Boolean(data.isStockTracked) : true;
    this.isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
  }

  static fromRequest(req) {
    return new CreateInventoryItemDto(req.body || {});
  }
}

class UpdateInventoryItemDto {
  constructor(data = {}) {
    if (data.name !== undefined) this.name = typeof data.name === "string" ? data.name.trim() : data.name;
    if (data.category !== undefined) this.category = typeof data.category === "string" ? data.category.trim().toUpperCase() : data.category;
    if (data.hsnCode !== undefined) this.hsnCode = data.hsnCode;
    if (data.unit !== undefined) this.unit = typeof data.unit === "string" ? data.unit.trim().toUpperCase() : data.unit;
    if (data.purchaseRate !== undefined) this.purchaseRate = Number(data.purchaseRate);
    if (data.saleRate !== undefined) this.saleRate = Number(data.saleRate);
    if (data.taxRate !== undefined) this.taxRate = Number(data.taxRate);
    if (data.reorderLevel !== undefined) this.reorderLevel = Number(data.reorderLevel);
    if (data.isStockTracked !== undefined) this.isStockTracked = Boolean(data.isStockTracked);
    if (data.isActive !== undefined) this.isActive = Boolean(data.isActive);
  }

  static fromRequest(req) {
    return new UpdateInventoryItemDto(req.body || {});
  }
}

class PostInventoryTransactionDto {
  constructor(data = {}) {
    this.itemId = data.itemId;
    this.branchId = data.branchId;
    this.type = typeof data.type === "string" ? data.type.trim().toUpperCase() : "";
    this.quantity = Number(data.quantity);
    this.consumptionType = data.consumptionType || null;
    this.referenceType = data.referenceType || null;
    this.referenceId = data.referenceId || null;
    this.notes = data.notes || null;
    this.performedBy = data.performedBy;
  }

  static fromRequest(req) {
    return new PostInventoryTransactionDto({
      ...req.body,
      performedBy: req.user?._id || req.user?.id,
    });
  }
}

class RecordOpeningStockDto {
  constructor(data = {}) {
    this.branchId = data.branchId;
    this.lines = Array.isArray(data.lines)
      ? data.lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitCost: l.unitCost ? Number(l.unitCost) : 0,
          notes: l.notes || null,
        }))
      : [];
    this.performedBy = data.performedBy;
  }

  static fromRequest(req) {
    return new RecordOpeningStockDto({
      ...req.body,
      performedBy: req.user?._id || req.user?.id,
    });
  }
}

class CreatePurchaseReceiptDto {
  constructor(data = {}) {
    this.branchId = data.branchId;
    this.supplierName = typeof data.supplierName === "string" ? data.supplierName.trim() : "";
    this.supplierInvoiceNo = data.supplierInvoiceNo || null;
    this.invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : null;
    this.remarks = data.remarks || null;
    this.items = Array.isArray(data.items)
      ? data.items.map((it) => ({
          itemId: it.itemId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice) || 0,
          taxRate: Number(it.taxRate) || 0,
          unit: it.unit || "PCS",
        }))
      : [];
    this.createdBy = data.createdBy;
  }

  static fromRequest(req) {
    return new CreatePurchaseReceiptDto({
      ...req.body,
      createdBy: req.user?._id || req.user?.id,
    });
  }
}

module.exports = {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  PostInventoryTransactionDto,
  RecordOpeningStockDto,
  CreatePurchaseReceiptDto,
};
