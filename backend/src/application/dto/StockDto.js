const mongoose = require("mongoose");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * Stock & Inventory Data Transfer Objects
 */

class SaveStockItemDto {
  constructor({
    _id,
    id,
    legacyFirestoreId,
    branchId,
    stockId,
    itemName,
    name,
    category = "General",
    description = "",
    amount,
    rate,
    unitPrice,
    qty,
    quantity,
    currentStock,
    stockType = "consumable",
    unit = null,
    pageRanges = null,
    minThreshold = 10,
    threshold = 10,
    branchName,
    branch,
    status = "Active",
    timestamp,
    userId,
    needsReview,
  } = {}) {
    if (_id || id) this._id = _id || id;
    if (legacyFirestoreId) this.legacyFirestoreId = legacyFirestoreId;
    this.branchId = branchId ? (typeof branchId === "string" ? branchId.trim() : branchId) : null;
    this.stockId = stockId ? String(stockId).trim() : "";
    this.itemName = (itemName || name || "").trim();
    this.name = this.itemName;
    this.category = category ? String(category).trim() : "General";
    this.description = description ? String(description).trim() : "";
    this.amount = Number(amount !== undefined ? amount : (rate !== undefined ? rate : (unitPrice || 0)));
    this.rate = this.amount;
    this.unitPrice = this.amount;
    this.qty = Number(qty !== undefined ? qty : (quantity !== undefined ? quantity : (currentStock || 0)));
    this.quantity = this.qty;
    this.currentStock = this.qty;
    this.stockType = stockType ? String(stockType).trim() : "consumable";
    this.unit = unit ? String(unit).trim() : null;
    this.pageRanges = pageRanges || null;
    this.minThreshold = Number(minThreshold !== undefined ? minThreshold : (threshold || 10));
    this.threshold = this.minThreshold;
    this.branchName = (branchName || branch || "").trim();
    this.branch = this.branchName;
    this.status = status || "Active";
    this.timestamp = timestamp ? new Date(timestamp) : new Date();
    this.userId = userId || null;
    this.needsReview = Boolean(needsReview);
  }

  static fromRequest(req) {
    const data = { ...req.body };
    if (req.params?.id) data._id = req.params.id;
    if (req.user?.userId && !data.userId) data.userId = req.user.userId;
    return new SaveStockItemDto(data);
  }

  validate() {
    if (!this._id && !this.itemName) {
      throw ErrorHelper.badRequest("itemName is required");
    }
    if (this.branchId && !mongoose.Types.ObjectId.isValid(this.branchId)) {
      throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
    }
  }
}

class UpdateStockItemDto {
  constructor(data = {}) {
    if (data.branchId !== undefined) {
      this.branchId = data.branchId ? (typeof data.branchId === "string" ? data.branchId.trim() : data.branchId) : null;
    }
    if (data.stockId !== undefined) this.stockId = String(data.stockId).trim();
    if (data.itemName !== undefined || data.name !== undefined) {
      this.itemName = String(data.itemName || data.name || "").trim();
      this.name = this.itemName;
    }
    if (data.category !== undefined) this.category = String(data.category).trim();
    if (data.description !== undefined) this.description = String(data.description).trim();
    if (data.amount !== undefined || data.rate !== undefined || data.unitPrice !== undefined) {
      this.amount = Number(data.amount !== undefined ? data.amount : (data.rate !== undefined ? data.rate : data.unitPrice));
      this.rate = this.amount;
      this.unitPrice = this.amount;
    }
    if (data.qty !== undefined || data.quantity !== undefined || data.currentStock !== undefined) {
      this.qty = Number(data.qty !== undefined ? data.qty : (data.quantity !== undefined ? data.quantity : data.currentStock));
      this.quantity = this.qty;
      this.currentStock = this.qty;
    }
    if (data.stockType !== undefined) this.stockType = String(data.stockType).trim();
    if (data.unit !== undefined) this.unit = data.unit ? String(data.unit).trim() : null;
    if (data.pageRanges !== undefined) this.pageRanges = data.pageRanges;
    if (data.minThreshold !== undefined || data.threshold !== undefined) {
      this.minThreshold = Number(data.minThreshold !== undefined ? data.minThreshold : data.threshold);
      this.threshold = this.minThreshold;
    }
    if (data.branchName !== undefined || data.branch !== undefined) {
      this.branchName = String(data.branchName || data.branch || "").trim();
      this.branch = this.branchName;
    }
    if (data.status !== undefined) this.status = String(data.status).trim();
    if (data.userId !== undefined) this.userId = data.userId;
    if (data.needsReview !== undefined) this.needsReview = Boolean(data.needsReview);
  }

  static fromRequest(req) {
    return new UpdateStockItemDto(req.body || {});
  }

  validate() {
    if (this.branchId !== undefined && this.branchId !== null) {
      if (!mongoose.Types.ObjectId.isValid(this.branchId)) {
        throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
      }
    }
  }
}

class StockItemResponseDto {
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
    return new StockItemResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new StockItemResponseDto(e));
  }
}

class SaveStockReadingDto {
  constructor({
    _id,
    id,
    legacyFirestoreId,
    branchId,
    branchName,
    branch,
    date,
    dateAt,
    stocks = [],
    items = [],
    rows = [],
    readings,
    totalAmount = 0,
    status = "Active",
    timestamp,
    lastUpdated,
    userId,
    submittedBy,
    finalSubmittedAt,
    finalSubmittedBy,
    isFinalSubmitted,
    isLocked,
    needsReview,
    notes,
  } = {}) {
    if (_id || id) this._id = _id || id;
    if (legacyFirestoreId) this.legacyFirestoreId = legacyFirestoreId;
    this.branchId = branchId ? (typeof branchId === "string" ? branchId.trim() : branchId) : null;
    this.branchName = (branchName || branch || "").trim();
    this.branch = this.branchName;
    this.date = date ? String(date).trim() : "";
    this.dateAt = dateAt ? new Date(dateAt) : (this.date ? new Date(this.date) : null);
    this.stocks = Array.isArray(stocks) && stocks.length > 0 ? stocks : Array.isArray(items) && items.length > 0 ? items : Array.isArray(rows) ? rows : [];
    this.items = this.stocks;
    this.rows = this.stocks;
    if (readings !== undefined) this.readings = readings;
    this.totalAmount = Number(totalAmount) || 0;
    this.status = status || "Active";
    this.timestamp = timestamp ? new Date(timestamp) : new Date();
    this.lastUpdated = lastUpdated ? new Date(lastUpdated) : null;
    this.userId = userId || null;
    if (submittedBy !== undefined) this.submittedBy = submittedBy;
    this.finalSubmittedAt = finalSubmittedAt ? new Date(finalSubmittedAt) : null;
    this.finalSubmittedBy = finalSubmittedBy || null;
    this.isFinalSubmitted = Boolean(isFinalSubmitted);
    this.isLocked = Boolean(isLocked);
    this.needsReview = Boolean(needsReview);
    if (notes !== undefined) this.notes = notes;
  }

  static fromRequest(req) {
    const data = { ...req.body };
    if (req.params?.id) data._id = req.params.id;
    if (req.user?.userId && !data.userId) data.userId = req.user.userId;
    return new SaveStockReadingDto(data);
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

class UpdateStockReadingDto {
  constructor(data = {}) {
    if (data.branchId !== undefined) {
      this.branchId = data.branchId ? (typeof data.branchId === "string" ? data.branchId.trim() : data.branchId) : null;
    }
    if (data.branchName !== undefined || data.branch !== undefined) {
      this.branchName = String(data.branchName || data.branch || "").trim();
      this.branch = this.branchName;
    }
    if (data.date !== undefined) {
      this.date = String(data.date).trim();
      this.dateAt = data.dateAt ? new Date(data.dateAt) : new Date(this.date);
    }
    if (data.stocks !== undefined || data.items !== undefined || data.rows !== undefined) {
      this.stocks = Array.isArray(data.stocks) ? data.stocks : Array.isArray(data.items) ? data.items : Array.isArray(data.rows) ? data.rows : [];
      this.items = this.stocks;
      this.rows = this.stocks;
    }
    if (data.readings !== undefined) this.readings = data.readings;
    if (data.totalAmount !== undefined) this.totalAmount = Number(data.totalAmount);
    if (data.status !== undefined) this.status = data.status;
    if (data.userId !== undefined) this.userId = data.userId;
    if (data.submittedBy !== undefined) this.submittedBy = data.submittedBy;
    if (data.finalSubmittedAt !== undefined) this.finalSubmittedAt = data.finalSubmittedAt ? new Date(data.finalSubmittedAt) : null;
    if (data.finalSubmittedBy !== undefined) this.finalSubmittedBy = data.finalSubmittedBy;
    if (data.isFinalSubmitted !== undefined) this.isFinalSubmitted = Boolean(data.isFinalSubmitted);
    if (data.isLocked !== undefined) this.isLocked = Boolean(data.isLocked);
    if (data.needsReview !== undefined) this.needsReview = Boolean(data.needsReview);
    if (data.notes !== undefined) this.notes = data.notes;
    this.lastUpdated = new Date();
  }

  static fromRequest(req) {
    return new UpdateStockReadingDto(req.body || {});
  }

  validate() {
    if (this.branchId !== undefined && this.branchId !== null) {
      if (!mongoose.Types.ObjectId.isValid(this.branchId)) {
        throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
      }
    }
  }
}

class StockReadingResponseDto {
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
    if (Array.isArray(this.stocks)) {
      this.stocks = this.stocks;
    } else if (Array.isArray(this.items)) {
      this.stocks = this.items;
    } else if (Array.isArray(this.rows)) {
      this.stocks = this.rows;
    } else {
      this.stocks = [];
    }
    delete this.id;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new StockReadingResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new StockReadingResponseDto(e));
  }
}

const CreateStockItemDto = SaveStockItemDto;
const CreateStockReadingDto = SaveStockReadingDto;

module.exports = {
  SaveStockItemDto,
  CreateStockItemDto,
  UpdateStockItemDto,
  StockItemResponseDto,
  SaveStockReadingDto,
  CreateStockReadingDto,
  UpdateStockReadingDto,
  StockReadingResponseDto,
};

