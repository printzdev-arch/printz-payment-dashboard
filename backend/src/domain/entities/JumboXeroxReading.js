/**
 * JumboXeroxReading Domain Entity
 */
class JumboXeroxReading {
  constructor({
    id,
    _id,
    date,
    branchName,
    branch = "",
    readings = {},
    rows = [],
    totalAmount = 0,
    totalSqMeters = 0,
    status = "Completed",
    submittedBy = "",
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
    this.totalSqMeters = Number(totalSqMeters) || 0;
    this.status = status;
    this.submittedBy = submittedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = JumboXeroxReading;
