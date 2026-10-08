const mongoose = require("mongoose");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * Payment (PaymentToBeCollected) Data Transfer Objects
 */

class CreatePaymentDto {
  constructor({
    branchId,
    date,
    balance = 0,
    paymentCollectedTillNow = 0,
    paymentToBeCollected = 0,
    items = [],
  } = {}) {
    this.branchId = branchId ? (typeof branchId === "string" ? branchId.trim() : branchId) : null;
    this.date = date ? String(date).trim() : new Date().toISOString().split("T")[0];
    this.balance = Number(balance) || 0;
    this.paymentCollectedTillNow = Number(paymentCollectedTillNow) || 0;
    this.paymentToBeCollected = Number(paymentToBeCollected) || 0;
    this.items = Array.isArray(items) ? items : [];

    const parsedDate = new Date(this.date);
    this.dateAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  }

  static fromRequest(req) {
    return new CreatePaymentDto(req.body || {});
  }

  validate() {
    if (!this.branchId) {
      throw ErrorHelper.badRequest("branchId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(this.branchId)) {
      throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
    }

    if (!this.date) {
      throw ErrorHelper.badRequest("date is required");
    }
  }
}

class UpdatePaymentDto {
  constructor(data = {}) {
    if (data.branchId !== undefined) {
      this.branchId = data.branchId ? (typeof data.branchId === "string" ? data.branchId.trim() : data.branchId) : null;
    }
    if (data.date !== undefined) {
      this.date = String(data.date).trim();
      const parsedDate = new Date(this.date);
      this.dateAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    if (data.balance !== undefined) this.balance = Number(data.balance) || 0;
    if (data.paymentCollectedTillNow !== undefined) this.paymentCollectedTillNow = Number(data.paymentCollectedTillNow) || 0;
    if (data.paymentToBeCollected !== undefined) this.paymentToBeCollected = Number(data.paymentToBeCollected) || 0;
    if (data.items !== undefined) this.items = Array.isArray(data.items) ? data.items : [];
  }

  static fromRequest(req) {
    return new UpdatePaymentDto(req.body || {});
  }

  validate() {
    if (this.branchId !== undefined && this.branchId !== null) {
      if (!mongoose.Types.ObjectId.isValid(this.branchId)) {
        throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
      }
    }
  }
}

class PaymentResponseDto {
  constructor(entity) {
    if (!entity) return;
    const rawId = entity._id || entity.id;
    this._id = rawId ? (rawId.toString ? rawId.toString() : rawId) : rawId;
    
    let bName = "";
    if (entity.branchId && typeof entity.branchId === "object" && entity.branchId.name) {
      this.branchId = entity.branchId._id ? entity.branchId._id.toString() : entity.branchId.toString();
      bName = entity.branchId.name;
    } else {
      this.branchId = entity.branchId
        ? (entity.branchId.toString ? entity.branchId.toString() : entity.branchId)
        : null;
    }
    this.branchName = bName || entity.branchName || "";
    this.date = entity.date || "";
    this.dateAt = entity.dateAt || null;
    this.balance = typeof entity.balance === "number" ? entity.balance : 0;
    this.paymentCollectedTillNow = typeof entity.paymentCollectedTillNow === "number" ? entity.paymentCollectedTillNow : 0;
    this.paymentToBeCollected = typeof entity.paymentToBeCollected === "number" ? entity.paymentToBeCollected : 0;
    this.items = Array.isArray(entity.items) ? entity.items : [];
    this.createdAt = entity.createdAt || null;
    this.updatedAt = entity.updatedAt || null;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new PaymentResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new PaymentResponseDto(e));
  }
}

module.exports = {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentResponseDto,
};
