/**
 * PrinterReading Domain Entity
 */
class PrinterReading {
  constructor({
    id,
    _id,
    date,
    branchName,
    branch = "",
    readings = {},
    rows = [],
    totalAmount = 0,
    totalCopies = 0,
    submittedBy = "",
    status = "Completed",
    notes = "",
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.date = date;
    this.branchName = branchName;
    this.branch = branch || branchName;
    this.readings = readings;
    this.rows = rows;
    this.totalAmount = Number(totalAmount) || 0;
    this.totalCopies = Number(totalCopies) || 0;
    this.submittedBy = submittedBy;
    this.status = status;
    this.notes = notes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = PrinterReading;
