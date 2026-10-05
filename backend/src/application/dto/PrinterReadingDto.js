const mongoose = require("mongoose");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * Printer Reading Data Transfer Objects
 */

class CreatePrinterReadingDto {
  constructor({
    branchId,
    branchName,
    branch,
    date,
    readings = {},
    userId = null,
    isFinalSubmitted = false,
    isLocked = false,
    needsReview = false,
  } = {}) {
    this.branchId = branchId ? (typeof branchId === "string" ? branchId.trim() : branchId) : null;
    this.branchName = branchName ? String(branchName).trim() : (branch ? String(branch).trim() : null);
    this.branch = this.branchName;
    this.date = date ? String(date).trim() : new Date().toISOString().split("T")[0];
    this.readings = readings !== undefined ? readings : {};
    this.userId = userId ? String(userId).trim() : null;
    this.isFinalSubmitted = Boolean(isFinalSubmitted);
    this.isLocked = Boolean(isLocked);
    this.needsReview = Boolean(needsReview);

    const parsedDate = new Date(this.date);
    this.dateAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    this.timestamp = new Date();
    this.lastUpdated = null;
    this.finalSubmittedAt = null;
    this.finalSubmittedBy = null;
  }

  static fromRequest(req) {
    const data = { ...req.body };
    if (req.user && !data.userId) {
      data.userId = req.user.id || req.user._id || req.user.email;
    }
    return new CreatePrinterReadingDto(data);
  }

  validate() {
    if (!this.date) {
      throw ErrorHelper.badRequest("date is required");
    }

    if (this.branchId && !mongoose.Types.ObjectId.isValid(this.branchId)) {
      throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
    }
  }
}

class UpdatePrinterReadingDto {
  constructor(data = {}) {
    if (data.branchId !== undefined) {
      this.branchId = data.branchId ? (typeof data.branchId === "string" ? data.branchId.trim() : data.branchId) : null;
    }
    if (data.branchName !== undefined || data.branch !== undefined) {
      this.branchName = data.branchName ? String(data.branchName).trim() : (data.branch ? String(data.branch).trim() : null);
      this.branch = this.branchName;
    }
    if (data.date !== undefined) {
      this.date = String(data.date).trim();
      const parsedDate = new Date(this.date);
      this.dateAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    if (data.readings !== undefined) this.readings = data.readings;
    if (data.userId !== undefined) this.userId = String(data.userId).trim();
    if (data.finalSubmittedAt !== undefined) this.finalSubmittedAt = data.finalSubmittedAt ? new Date(data.finalSubmittedAt) : null;
    if (data.finalSubmittedBy !== undefined) this.finalSubmittedBy = data.finalSubmittedBy ? String(data.finalSubmittedBy).trim() : null;
    if (data.isFinalSubmitted !== undefined) this.isFinalSubmitted = Boolean(data.isFinalSubmitted);
    if (data.isLocked !== undefined) this.isLocked = Boolean(data.isLocked);
    if (data.needsReview !== undefined) this.needsReview = Boolean(data.needsReview);
    this.lastUpdated = new Date();
  }

  static fromRequest(req) {
    return new UpdatePrinterReadingDto(req.body || {});
  }

  validate() {
    if (this.branchId !== undefined && this.branchId !== null) {
      if (!mongoose.Types.ObjectId.isValid(this.branchId)) {
        throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
      }
    }
  }
}

class PrinterReadingResponseDto {
  constructor(entity) {
    if (!entity) return;
    const raw = entity.toJSON ? entity.toJSON() : { ...entity };

    this._id = raw._id ? (raw._id.toString ? raw._id.toString() : raw._id) : raw._id;
    this.legacyFirestoreId = raw.legacyFirestoreId !== undefined ? raw.legacyFirestoreId : null;
    this.branchId = raw.branchId ? (raw.branchId.toString ? raw.branchId.toString() : raw.branchId) : null;
    this.branchName = raw.branchName || raw.branch || "";
    this.branch = raw.branch || this.branchName;
    this.date = raw.date || "";
    this.dateAt = raw.dateAt || null;
    this.readings = raw.readings !== undefined ? raw.readings : {};
    this.timestamp = raw.timestamp || null;
    this.lastUpdated = raw.lastUpdated || null;
    this.userId = raw.userId || null;
    this.finalSubmittedAt = raw.finalSubmittedAt || null;
    this.finalSubmittedBy = raw.finalSubmittedBy || null;
    this.isFinalSubmitted = Boolean(raw.isFinalSubmitted);
    this.isLocked = Boolean(raw.isLocked);
    this.needsReview = Boolean(raw.needsReview);
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new PrinterReadingResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new PrinterReadingResponseDto(e));
  }
}

// Aliases
const SavePrinterReadingDto = CreatePrinterReadingDto;
const PrinterReadingDto = CreatePrinterReadingDto;

module.exports = {
  CreatePrinterReadingDto,
  SavePrinterReadingDto,
  UpdatePrinterReadingDto,
  PrinterReadingResponseDto,
  PrinterReadingDto,
};
