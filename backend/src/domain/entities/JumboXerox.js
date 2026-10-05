/**
 * JumboXerox Machine / Pricing Domain Entity
 */
class JumboXerox {
  constructor({
    _id,
    id,
    branchId,
    printerId,
    printerRef = null,
    printerName,
    size,
    type,
    unitPrice = 0,
    isActive = true,
    clonedFrom = null,
    movedFrom = null,
    reason = null,
    deactivatedAt = null,
    updatedBy = null,
    createdAt,
    updatedAt,
  } = {}) {
    this._id = _id || id;
    this.branchId = branchId;
    this.printerId = printerId;
    this.printerRef = printerRef;
    this.printerName = printerName;
    this.size = size;
    this.type = type;
    this.unitPrice = unitPrice;
    this.isActive = isActive;
    this.clonedFrom = clonedFrom;
    this.movedFrom = movedFrom;
    this.reason = reason;
    this.deactivatedAt = deactivatedAt;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = JumboXerox;
