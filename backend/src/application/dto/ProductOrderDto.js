/**
 * Product Order & Stock Transfer Data Transfer Objects (DTOs)
 * Covers: ProductOrder, ProductOrderItem, StockTransfer
 */

class CreateProductOrderDto {
  constructor(data = {}) {
    this.requestingBranchId = data.requestingBranchId;
    this.remarks = data.remarks || null;
    this.items = Array.isArray(data.items)
      ? data.items.map((it) => ({
          itemId: it.itemId,
          requestedQty: Number(it.requestedQty),
          unit: it.unit || "PCS",
          remarks: it.remarks || null,
        }))
      : [];
    this.requestedBy = data.requestedBy;
  }

  static fromRequest(req) {
    return new CreateProductOrderDto({
      ...req.body,
      requestedBy: req.user?._id || req.user?.id,
    });
  }
}

class UpdateProductOrderItemsDto {
  constructor(data = {}) {
    this.items = Array.isArray(data.items)
      ? data.items.map((it) => ({
          itemId: it.itemId,
          requestedQty: Number(it.requestedQty),
          unit: it.unit || "PCS",
          remarks: it.remarks || null,
        }))
      : [];
  }

  static fromRequest(req) {
    return new UpdateProductOrderItemsDto(req.body || {});
  }
}

class ApproveProductOrderDto {
  constructor(data = {}) {
    this.fromBranchId = data.fromBranchId || null;
    this.remarks = data.remarks || null;
    const itemsList = data.approvedItems || data.items;
    this.approvedItems = Array.isArray(itemsList)
      ? itemsList.map((it) => ({
          itemId: it.itemId,
          approvedQty: Number(it.approvedQty),
        }))
      : [];
    this.approvedBy = data.approvedBy;
  }

  static fromRequest(req) {
    return new ApproveProductOrderDto({
      ...req.body,
      approvedBy: req.user?._id || req.user?.id,
    });
  }
}

class RejectProductOrderDto {
  constructor(data = {}) {
    this.remarks = data.remarks || data.reason || data.comments || "";
    this.rejectedBy = data.rejectedBy;
  }

  static fromRequest(req) {
    return new RejectProductOrderDto({
      ...req.body,
      rejectedBy: req.user?._id || req.user?.id,
    });
  }
}

class DispatchStockTransferDto {
  constructor(data = {}) {
    this.remarks = data.remarks || null;
    const itemsList = data.dispatchedItems || data.items;
    this.dispatchedItems = Array.isArray(itemsList)
      ? itemsList.map((it) => ({
          itemId: it.itemId,
          dispatchedQty: Number(it.dispatchedQty),
        }))
      : [];
    this.dispatchedBy = data.dispatchedBy;
  }

  static fromRequest(req) {
    return new DispatchStockTransferDto({
      ...req.body,
      dispatchedBy: req.user?._id || req.user?.id,
    });
  }
}

class ReceiveStockTransferDto {
  constructor(data = {}) {
    this.remarks = data.remarks || null;
    const itemsList = data.receivedItems || data.items;
    this.receivedItems = Array.isArray(itemsList)
      ? itemsList.map((it) => ({
          itemId: it.itemId,
          receivedQty: Number(it.receivedQty),
        }))
      : [];
    this.receivedBy = data.receivedBy;
  }

  static fromRequest(req) {
    return new ReceiveStockTransferDto({
      ...req.body,
      receivedBy: req.user?._id || req.user?.id,
    });
  }
}

module.exports = {
  CreateProductOrderDto,
  UpdateProductOrderItemsDto,
  ApproveProductOrderDto,
  RejectProductOrderDto,
  DispatchStockTransferDto,
  ReceiveStockTransferDto,
};
