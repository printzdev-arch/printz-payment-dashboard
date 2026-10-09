/**
 * NumberSequence Domain Entity
 */
class NumberSequence {
  constructor({
    id,
    _id,
    sequenceKey,
    branchId = null,
    period = null,
    lastValue = 0,
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.sequenceKey = sequenceKey ? String(sequenceKey).toUpperCase() : ""; // e.g. "EMPLOYEE", "APPROVAL"
    this.branchId = branchId;
    this.period = period;
    this.lastValue = Number(lastValue) || 0;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }
}

module.exports = NumberSequence;
