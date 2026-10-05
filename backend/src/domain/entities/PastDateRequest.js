/**
 * PastDateRequest Domain Entity
 */
class PastDateRequest {
  constructor({
    id,
    _id,
    requestedBranch,
    requestedBy,
    requestedDate,
    status = "Pending",
    type = "dailyReadings",
    reason = "",
    approvedBy = "",
    approvedAt = null,
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.requestedBranch = requestedBranch;
    this.requestedBy = requestedBy;
    this.requestedDate = requestedDate;
    this.status = status;
    this.type = type;
    this.reason = reason;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = PastDateRequest;
