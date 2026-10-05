/**
 * Printer Domain Entity
 */
class Printer {
  constructor({
    id,
    _id,
    printerId = "",
    printerName,
    brand = "",
    model = "",
    branchName,
    branch = "",
    location = "",
    serialNumber = "",
    status = "Active",
    rates = {},
    colorRates = {},
    bwRates = {},
    customFields = {},
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.printerId = printerId;
    this.printerName = printerName;
    this.brand = brand;
    this.model = model;
    this.branchName = branchName;
    this.branch = branch || branchName;
    this.location = location;
    this.serialNumber = serialNumber;
    this.status = status;
    this.rates = rates;
    this.colorRates = colorRates;
    this.bwRates = bwRates;
    this.customFields = customFields;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Printer;
