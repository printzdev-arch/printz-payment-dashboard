/**
 * Delivery Order Data Transfer Objects
 */
class DeliverOrderDto {
  constructor({ receivedBy = "", remarks = "" } = {}) {
    this.receivedBy = typeof receivedBy === "string" ? receivedBy.trim() : "";
    this.remarks = typeof remarks === "string" ? remarks.trim() : "";
  }

  static fromRequest(req) {
    return new DeliverOrderDto(req.body || {});
  }
}

class DeliveryOrderResponseDto {
  constructor(entity) {
    if (!entity) return;
    const rawId = entity._id || entity.id;
    this._id = rawId ? (rawId.toString ? rawId.toString() : rawId) : rawId;
    this.deliveryNo = entity.deliveryNo || "";
    this.jobOrderId = entity.jobOrderId || null;
    this.branchId = entity.branchId || null;
    this.customerId = entity.customerId || null;
    this.customerName = entity.customerName || "";
    this.deliveryAddress = entity.deliveryAddress || "";
    this.quantity = typeof entity.quantity === "number" ? entity.quantity : 0;
    this.status = entity.status || "READY";
    this.packedAt = entity.packedAt || null;
    this.packedBy = entity.packedBy || null;
    this.dispatchedAt = entity.dispatchedAt || null;
    this.dispatchedBy = entity.dispatchedBy || null;
    this.deliveredAt = entity.deliveredAt || null;
    this.deliveredBy = entity.deliveredBy || null;
    this.receivedBy = entity.receivedBy || null;
    this.remarks = entity.remarks || "";
    this.createdAt = entity.createdAt || null;
    this.updatedAt = entity.updatedAt || null;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new DeliveryOrderResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new DeliveryOrderResponseDto(e));
  }
}

module.exports = {
  DeliverOrderDto,
  DeliveryOrderResponseDto,
};
