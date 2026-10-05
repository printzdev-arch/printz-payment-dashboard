/**
 * Sale Domain Entity
 */
class Sale {
  constructor({
    id,
    _id,
    branchID,
    branchName,
    managerID,
    invoiceNo,
    date,
    itemsSold = [],
    subtotal = 0,
    gst = 0,
    grandTotal = 0,
    totalAmount = 0,
    paymentStatus = "Paid",
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.branchID = branchID ? String(branchID).trim() : "";
    this.branchName = branchName ? String(branchName).trim() : "";
    this.managerID = managerID;
    this.invoiceNo = invoiceNo ? String(invoiceNo).trim().toUpperCase() : "";
    this.date = date ? String(date).trim() : "";
    this.itemsSold = Array.isArray(itemsSold)
      ? itemsSold.map((item) => ({
          itemID: item.itemID ? String(item.itemID).trim() : "",
          name: item.name ? String(item.name).trim() : "",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          totalAmount:
            Number(item.totalAmount) ||
            (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
        }))
      : [];
    this.subtotal = Number(subtotal) || 0;
    this.gst = Number(gst) || 0;
    this.grandTotal = Number(grandTotal) || 0;
    this.totalAmount = Number(totalAmount) || this.grandTotal;
    this.paymentStatus = paymentStatus || "Paid";
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Sale;
