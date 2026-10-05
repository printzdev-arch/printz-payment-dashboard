const mongoose = require("mongoose");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * Printer Data Transfer Objects
 */

class CreatePrinterDto {
  constructor({
    branchId,
    printerId,
    printerName,
    name,
    printerType,
    brand,
    model,
    customServices = [],
    prices = [],
    rates,
    colorRates,
    bwRates,
    isActive = true,
    branchName,
    branch,
    location,
    serialNumber,
    status = "Active",
  } = {}) {
    this.branchId = branchId ? (typeof branchId === "string" ? branchId.trim() : branchId) : null;
    this.printerId = printerId ? String(printerId).trim() : "";
    this.printerName = (printerName || name || "").trim();
    this.name = this.printerName;
    this.printerType = printerType ? String(printerType).trim() : "";
    this.brand = brand ? String(brand).trim() : "";
    this.model = model ? String(model).trim() : "";
    this.customServices = Array.isArray(customServices) ? customServices : [];
    this.prices = Array.isArray(prices) ? prices : [];
    this.rates = rates || {};
    if (colorRates) this.colorRates = colorRates;
    if (bwRates) this.bwRates = bwRates;
    this.isActive = isActive !== undefined ? Boolean(isActive) : true;
    this.branchName = (branchName || branch || location || "").trim();
    this.branch = this.branchName;
    this.location = (location || this.branchName || "").trim();
    this.serialNumber = serialNumber ? String(serialNumber).trim() : "";
    this.status = status || "Active";
  }

  static fromRequest(req) {
    return new CreatePrinterDto(req.body || {});
  }

  validate() {
    if (!this.printerName) {
      throw ErrorHelper.badRequest("printerName is required");
    }

    if (this.branchId && !mongoose.Types.ObjectId.isValid(this.branchId)) {
      throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
    }
  }
}

class UpdatePrinterDto {
  constructor(data = {}) {
    if (data.branchId !== undefined) {
      this.branchId = data.branchId ? (typeof data.branchId === "string" ? data.branchId.trim() : data.branchId) : null;
    }
    if (data.printerId !== undefined) this.printerId = String(data.printerId).trim();
    if (data.printerName !== undefined || data.name !== undefined) {
      this.printerName = String(data.printerName || data.name || "").trim();
      this.name = this.printerName;
    }
    if (data.printerType !== undefined) this.printerType = String(data.printerType).trim();
    if (data.brand !== undefined) this.brand = String(data.brand).trim();
    if (data.model !== undefined) this.model = String(data.model).trim();
    if (data.customServices !== undefined) this.customServices = Array.isArray(data.customServices) ? data.customServices : [];
    if (data.prices !== undefined) this.prices = Array.isArray(data.prices) ? data.prices : [];
    if (data.rates !== undefined) this.rates = data.rates;
    if (data.colorRates !== undefined) this.colorRates = data.colorRates;
    if (data.bwRates !== undefined) this.bwRates = data.bwRates;
    if (data.isActive !== undefined) this.isActive = Boolean(data.isActive);
    if (data.branchName !== undefined || data.branch !== undefined) {
      this.branchName = String(data.branchName || data.branch || "").trim();
      this.branch = this.branchName;
    }
    if (data.location !== undefined) this.location = String(data.location).trim();
    if (data.serialNumber !== undefined) this.serialNumber = String(data.serialNumber).trim();
    if (data.status !== undefined) this.status = String(data.status).trim();
  }

  static fromRequest(req) {
    return new UpdatePrinterDto(req.body || {});
  }

  validate() {
    if (this.branchId !== undefined && this.branchId !== null) {
      if (!mongoose.Types.ObjectId.isValid(this.branchId)) {
        throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
      }
    }
  }
}

class PrinterResponseDto {
  constructor(entity) {
    if (!entity) return;
    const raw = entity.toJSON ? entity.toJSON() : { ...entity };
    delete raw.id;

    Object.assign(this, raw);
    if (this._id && this._id.toString) {
      this._id = this._id.toString();
    }
    if (this.branchId && this.branchId.toString) {
      this.branchId = this.branchId.toString();
    }
    delete this.id;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new PrinterResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new PrinterResponseDto(e));
  }
}

module.exports = {
  CreatePrinterDto,
  UpdatePrinterDto,
  PrinterResponseDto,
};
