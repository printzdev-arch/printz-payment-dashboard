const mongoose = require("mongoose");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * Total Amount & Financial Reconciliation Data Transfer Objects
 */

class SaveTotalAmountDto {
  constructor({
    _id,
    id,
    legacyFirestoreId,
    branchId,
    branchName,
    branch,
    date,
    dateAt,
    totalAmount,
    cash = 0,
    online = 0,
    balance = 0,
    expenses = 0,
    rows = [],
    previousBalanceRows = [],
    denominations,
    status,
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
    remarks,
  } = {}) {
    if (_id || id) this._id = _id || id;
    if (legacyFirestoreId) this.legacyFirestoreId = legacyFirestoreId;
    this.branchId = branchId ? (typeof branchId === "string" ? branchId.trim() : branchId) : null;
    this.branchName = (branchName || branch || "").trim();
    this.branch = this.branchName;
    this.date = date ? String(date).trim() : "";
    this.dateAt = dateAt ? new Date(dateAt) : (this.date ? new Date(this.date) : null);
    this.totalAmount = Number(totalAmount) || 0;
    this.cash = Number(cash) || 0;
    this.online = Number(online) || 0;
    this.balance = Number(balance) || 0;
    this.expenses = Number(expenses) || 0;
    this.rows = Array.isArray(rows) ? rows : [];
    this.previousBalanceRows = Array.isArray(previousBalanceRows) ? previousBalanceRows : [];
    if (denominations !== undefined) this.denominations = denominations;
    if (status !== undefined) this.status = status;
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
    if (remarks !== undefined) this.remarks = remarks;
  }

  static fromRequest(req) {
    const data = { ...req.body };
    if (req.params?.id) data._id = req.params.id;
    if (req.user?.userId && !data.userId) data.userId = req.user.userId;
    return new SaveTotalAmountDto(data);
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

class UpdateTotalAmountDto {
  constructor(data = {}) {
    if (data.branchId !== undefined) {
      this.branchId = data.branchId ? (typeof data.branchId === "string" ? data.branchId.trim() : data.branchId) : null;
    }
    if (data.branchName !== undefined || data.branch !== undefined) {
      this.branchName = (data.branchName || data.branch || "").trim();
      this.branch = this.branchName;
    }
    if (data.date !== undefined) {
      this.date = String(data.date).trim();
      this.dateAt = data.dateAt ? new Date(data.dateAt) : new Date(this.date);
    }
    if (data.totalAmount !== undefined) this.totalAmount = Number(data.totalAmount);
    if (data.cash !== undefined) this.cash = Number(data.cash);
    if (data.online !== undefined) this.online = Number(data.online);
    if (data.balance !== undefined) this.balance = Number(data.balance);
    if (data.expenses !== undefined) this.expenses = Number(data.expenses);
    if (data.rows !== undefined) this.rows = Array.isArray(data.rows) ? data.rows : [];
    if (data.previousBalanceRows !== undefined) this.previousBalanceRows = Array.isArray(data.previousBalanceRows) ? data.previousBalanceRows : [];
    if (data.denominations !== undefined) this.denominations = data.denominations;
    if (data.status !== undefined) this.status = data.status;
    if (data.userId !== undefined) this.userId = data.userId;
    if (data.submittedBy !== undefined) this.submittedBy = data.submittedBy;
    if (data.finalSubmittedAt !== undefined) this.finalSubmittedAt = data.finalSubmittedAt ? new Date(data.finalSubmittedAt) : null;
    if (data.finalSubmittedBy !== undefined) this.finalSubmittedBy = data.finalSubmittedBy;
    if (data.isFinalSubmitted !== undefined) this.isFinalSubmitted = Boolean(data.isFinalSubmitted);
    if (data.isLocked !== undefined) this.isLocked = Boolean(data.isLocked);
    if (data.needsReview !== undefined) this.needsReview = Boolean(data.needsReview);
    if (data.notes !== undefined) this.notes = data.notes;
    if (data.remarks !== undefined) this.remarks = data.remarks;
    this.lastUpdated = new Date();
  }

  static fromRequest(req) {
    return new UpdateTotalAmountDto(req.body || {});
  }

  validate() {
    if (this.branchId !== undefined && this.branchId !== null) {
      if (!mongoose.Types.ObjectId.isValid(this.branchId)) {
        throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
      }
    }
  }
}

class TotalAmountResponseDto {
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
    if (Array.isArray(this.rows)) {
      this.rows = this.rows.map((r) => {
        const rowCopy = { ...r };
        if (rowCopy.printerRef && rowCopy.printerRef.toString) {
          rowCopy.printerRef = rowCopy.printerRef.toString();
        }
        return rowCopy;
      });
    } else {
      this.rows = [];
    }
    if (!Array.isArray(this.previousBalanceRows)) {
      this.previousBalanceRows = [];
    }
    delete this.id;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new TotalAmountResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new TotalAmountResponseDto(e));
  }
}

const CreateTotalAmountDto = SaveTotalAmountDto;

module.exports = {
  SaveTotalAmountDto,
  CreateTotalAmountDto,
  UpdateTotalAmountDto,
  TotalAmountResponseDto,
};

