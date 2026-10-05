/**
 * FinalizedDate Domain Entity
 */
class FinalizedDate {
  constructor({
    id,
    _id,
    branchName,
    branch = "",
    date,
    isFinalized = true,
    finalizedBy = "",
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.branchName = branchName;
    this.branch = branch || branchName;
    this.date = date;
    this.isFinalized = isFinalized;
    this.finalizedBy = finalizedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = FinalizedDate;
