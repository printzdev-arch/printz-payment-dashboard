/**
 * Payment Domain Entity (PaymentToBeCollected)
 */
class Payment {
  constructor({
    id,
    _id,
    customerName = "",
    phoneNumber = "",
    amount = 0,
    collectedAmount = 0,
    remainingAmount = 0,
    date,
    branchName,
    branch = "",
    invoiceNo = "",
    status = "Pending",
    notes = "",
    paymentMethod = "Cash",
    collectedDate = "",
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.customerName = customerName;
    this.phoneNumber = phoneNumber;
    this.amount = Number(amount) || 0;
    this.collectedAmount = Number(collectedAmount) || 0;
    this.remainingAmount = Number(remainingAmount) || 0;
    this.date = date;
    this.branchName = branchName;
    this.branch = branch || branchName;
    this.invoiceNo = invoiceNo;
    this.status = status;
    this.notes = notes;
    this.paymentMethod = paymentMethod;
    this.collectedDate = collectedDate;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Payment;
