/**
 * TotalAmountReading Domain Entity
 */
class TotalAmountReading {
  constructor({
    id,
    _id,
    date,
    branchName,
    branch = "",
    totalAmount = 0,
    cash = 0,
    online = 0,
    balance = 0,
    expenses = 0,
    rows = [],
    denominations = {},
    status = "Completed",
    submittedBy = "",
    notes = "",
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.date = date;
    this.branchName = branchName;
    this.branch = branch || branchName;
    this.totalAmount = Number(totalAmount) || 0;
    this.cash = Number(cash) || 0;
    this.online = Number(online) || 0;
    this.balance = Number(balance) || 0;
    this.expenses = Number(expenses) || 0;
    this.rows = rows;
    this.denominations = denominations;
    this.status = status;
    this.submittedBy = submittedBy;
    this.notes = notes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = TotalAmountReading;
