/**
 * Customer Domain Entity
 * Represents Master Customer / Client for Job Orders and POS Sales.
 */
class Customer {
  constructor({
    id,
    _id,
    customerCode,
    name,
    mobile,
    email = null,
    gstin = null,
    address = null,
    customerType = "WALK_IN",
    creditLimit = 0,
    outstandingBalance = 0,
    isActive = true,
    branchId = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.customerCode = customerCode ? String(customerCode).trim().toUpperCase() : "";
    this.name = name ? String(name).trim() : "";
    this.mobile = mobile ? String(mobile).trim() : "";
    this.email = email ? String(email).trim().toLowerCase() : null;
    this.gstin = gstin ? String(gstin).trim().toUpperCase() : null;
    this.address = address ? String(address).trim() : null;
    this.customerType = customerType ? String(customerType).trim().toUpperCase() : "WALK_IN"; // WALK_IN, B2B, REGULAR
    this.creditLimit = Number(creditLimit) || 0;
    this.outstandingBalance = Number(outstandingBalance) || 0;
    this.isActive = isActive !== undefined ? Boolean(isActive) : true;
    this.branchId = branchId || null;
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
    this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }
}

module.exports = Customer;
