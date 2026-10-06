/**
 * Jumbo Xerox Data Transfer Objects
 */

class SaveJumboXeroxMachineDto {
  constructor({
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
    updatedBy = null,
  } = {}) {
    this.branchId = typeof branchId === "string" ? branchId.trim() : branchId;
    this.printerId = typeof printerId === "string" ? printerId.trim() : "";
    this.printerRef = printerRef || null;
    this.printerName = typeof printerName === "string" ? printerName.trim() : "";
    this.size = typeof size === "string" ? size.trim() : "";
    this.type = typeof type === "string" ? type.trim() : "";
    this.unitPrice = Number(unitPrice) || 0;
    this.isActive = isActive !== undefined ? Boolean(isActive) : true;
    this.clonedFrom = clonedFrom ? String(clonedFrom).trim() : null;
    this.movedFrom = movedFrom ? String(movedFrom).trim() : null;
    this.reason = reason ? String(reason).trim() : null;
    this.updatedBy = updatedBy ? String(updatedBy).trim() : null;
  }

  static fromRequest(req) {
    return new SaveJumboXeroxMachineDto(req.body || {});
  }
}

class UpdateJumboXeroxMachineDto {
  constructor(data = {}) {
    if (data.branchId !== undefined) this.branchId = typeof data.branchId === "string" ? data.branchId.trim() : data.branchId;
    if (data.printerId !== undefined) this.printerId = typeof data.printerId === "string" ? data.printerId.trim() : "";
    if (data.printerRef !== undefined) this.printerRef = data.printerRef || null;
    if (data.printerName !== undefined) this.printerName = typeof data.printerName === "string" ? data.printerName.trim() : "";
    if (data.size !== undefined) this.size = typeof data.size === "string" ? data.size.trim() : "";
    if (data.type !== undefined) this.type = typeof data.type === "string" ? data.type.trim() : "";
    if (data.unitPrice !== undefined) this.unitPrice = Number(data.unitPrice) || 0;
    if (data.isActive !== undefined) this.isActive = Boolean(data.isActive);
    if (data.clonedFrom !== undefined) this.clonedFrom = data.clonedFrom ? String(data.clonedFrom).trim() : null;
    if (data.movedFrom !== undefined) this.movedFrom = data.movedFrom ? String(data.movedFrom).trim() : null;
    if (data.reason !== undefined) this.reason = data.reason ? String(data.reason).trim() : null;
    if (data.updatedBy !== undefined) this.updatedBy = data.updatedBy ? String(data.updatedBy).trim() : null;
    if (data.deactivatedAt !== undefined) this.deactivatedAt = data.deactivatedAt;
  }

  static fromRequest(req) {
    return new UpdateJumboXeroxMachineDto(req.body || {});
  }
}

class JumboXeroxMachineResponseDto {
  constructor(machine) {
    if (!machine) return;
    const rawId = machine._id || machine.id;
    this._id = rawId ? rawId.toString() : rawId;
    this.branchId = machine.branchId ? machine.branchId.toString() : null;
    this.printerId = machine.printerId || "";
    this.printerRef = machine.printerRef ? machine.printerRef.toString() : null;
    this.printerName = machine.printerName || "";
    this.size = machine.size || "";
    this.type = machine.type || "";
    this.unitPrice = typeof machine.unitPrice === "number" ? machine.unitPrice : 0;
    this.isActive = machine.isActive !== undefined ? Boolean(machine.isActive) : true;
    this.clonedFrom = machine.clonedFrom || null;
    this.movedFrom = machine.movedFrom || null;
    this.reason = machine.reason || null;
    this.createdAt = machine.createdAt || null;
    this.updatedAt = machine.updatedAt || null;
    this.deactivatedAt = machine.deactivatedAt || null;
    this.updatedBy = machine.updatedBy || null;
  }

  static fromEntity(machine) {
    if (!machine) return null;
    return new JumboXeroxMachineResponseDto(machine);
  }

  static fromEntities(machines = []) {
    if (!Array.isArray(machines)) return [];
    return machines.map((m) => new JumboXeroxMachineResponseDto(m));
  }
}

class SaveJumboXeroxReadingDto {
  constructor({
    _id,
    id,
    branchId,
    branchName,
    branch,
    date,
    machineName,
    name,
    startReading = 0,
    endReading = 0,
    totalSqFt,
    rate,
    totalAmount,
    rows = [],
    notes,
    jumboCounter,
    totalQty,
    totalSqMeters,
    userId,
    submittedBy,
    readings,
    status,
    isFinalSubmitted,
    isLocked,
  } = {}) {
    if (_id || id) {
      this._id = _id || id;
      this.id = id || _id;
    }
    if (branchId) this.branchId = branchId;
    this.branchName = (branchName || branch || "").trim();
    this.branch = this.branchName;
    this.date = date || new Date().toISOString().split("T")[0];
    this.machineName = (machineName || name || "").trim();
    this.name = this.machineName;
    this.startReading = Number(startReading) || 0;
    this.endReading = Number(endReading) || 0;
    this.totalSqFt =
      totalSqFt !== undefined
        ? Number(totalSqFt)
        : Math.max(0, this.endReading - this.startReading);
    this.rate = Number(rate) || 0;
    this.totalAmount =
      totalAmount !== undefined
        ? Number(totalAmount)
        : this.totalSqFt * this.rate;
    this.rows = Array.isArray(rows) ? rows : [];
    this.notes = notes ? notes.trim() : "";
    if (jumboCounter !== undefined) this.jumboCounter = jumboCounter;
    if (totalQty !== undefined) this.totalQty = Number(totalQty) || 0;
    if (totalSqMeters !== undefined) this.totalSqMeters = Number(totalSqMeters) || 0;
    if (userId) this.userId = userId;
    if (submittedBy) this.submittedBy = submittedBy;
    if (readings) this.readings = readings;
    if (status) this.status = status;
    if (isFinalSubmitted !== undefined) this.isFinalSubmitted = isFinalSubmitted;
    if (isLocked !== undefined) this.isLocked = isLocked;
  }

  static fromRequest(req) {
    const data = { ...req.body };
    if (req.params?.id) {
      data._id = req.params.id;
      data.id = req.params.id;
    }
    return new SaveJumboXeroxReadingDto(data);
  }
}

module.exports = {
  SaveJumboXeroxMachineDto,
  CreateJumboXeroxMachineDto: SaveJumboXeroxMachineDto,
  UpdateJumboXeroxMachineDto,
  JumboXeroxMachineResponseDto,
  SaveJumboXeroxReadingDto,
};
