/**
 * Customer Module Data Transfer Objects (DTOs)
 */

class CreateCustomerDto {
  constructor(data = {}) {
    this.customerCode = typeof data.customerCode === "string" ? data.customerCode.trim().toUpperCase() : undefined;
    this.name = typeof data.name === "string" ? data.name.trim() : "";
    this.mobile = typeof data.mobile === "string" ? data.mobile.trim() : "";
    this.email = typeof data.email === "string" ? data.email.trim().toLowerCase() : null;
    this.company = typeof data.company === "string" ? data.company.trim() : typeof data.companyName === "string" ? data.companyName.trim() : "";
    this.companyName = this.company;
    this.phone = typeof data.phone === "string" ? data.phone.trim() : this.mobile;
    this.gstin = typeof data.gstin === "string" ? data.gstin.trim().toUpperCase() : typeof data.gstNumber === "string" ? data.gstNumber.trim().toUpperCase() : null;
    this.gstNumber = this.gstin;
    this.address = typeof data.address === "string" ? data.address.trim() : null;
    this.customerType = typeof data.customerType === "string" ? data.customerType.trim() : "WALK_IN";
    this.customerSource = typeof data.customerSource === "string" ? data.customerSource.trim() : (this.company ? "COMPANY" : "INDIVIDUAL");
    this.type = typeof data.type === "string" ? data.type.trim() : "";
    this.remarks = typeof data.remarks === "string" ? data.remarks.trim() : typeof data.notes === "string" ? data.notes.trim() : "";
    this.notes = this.remarks;
    this.creditLimit = Number(data.creditLimit) || 0;
    this.branchId = data.branchId || null;
    this.visitedBranches = Array.isArray(data.visitedBranches) ? data.visitedBranches : (this.branchId ? [this.branchId] : []);
    this.isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
  }

  static fromRequest(req) {
    return new CreateCustomerDto(req.body || {});
  }
}

class UpdateCustomerDto {
  constructor(data = {}) {
    if (data.name !== undefined) this.name = typeof data.name === "string" ? data.name.trim() : data.name;
    if (data.mobile !== undefined) this.mobile = typeof data.mobile === "string" ? data.mobile.trim() : data.mobile;
    if (data.phone !== undefined) this.phone = typeof data.phone === "string" ? data.phone.trim() : data.phone;
    if (data.email !== undefined) this.email = typeof data.email === "string" ? data.email.trim().toLowerCase() : data.email;
    if (data.company !== undefined || data.companyName !== undefined) {
      const comp = typeof data.company === "string" ? data.company.trim() : typeof data.companyName === "string" ? data.companyName.trim() : "";
      this.company = comp;
      this.companyName = comp;
    }
    if (data.gstin !== undefined || data.gstNumber !== undefined) {
      const g = data.gstin !== undefined ? data.gstin : data.gstNumber;
      this.gstin = typeof g === "string" ? g.trim().toUpperCase() : g;
      this.gstNumber = this.gstin;
    }
    if (data.address !== undefined) this.address = typeof data.address === "string" ? data.address.trim() : data.address;
    if (data.customerType !== undefined) this.customerType = typeof data.customerType === "string" ? data.customerType.trim() : data.customerType;
    if (data.customerSource !== undefined) this.customerSource = typeof data.customerSource === "string" ? data.customerSource.trim() : data.customerSource;
    if (data.type !== undefined) this.type = typeof data.type === "string" ? data.type.trim() : data.type;
    if (data.remarks !== undefined || data.notes !== undefined) {
      const r = data.remarks !== undefined ? data.remarks : data.notes;
      this.remarks = typeof r === "string" ? r.trim() : r;
      this.notes = this.remarks;
    }
    if (data.creditLimit !== undefined) this.creditLimit = Number(data.creditLimit);
    if (data.branchId !== undefined) this.branchId = data.branchId;
    if (data.visitedBranches !== undefined) this.visitedBranches = data.visitedBranches;
    if (data.isActive !== undefined) this.isActive = Boolean(data.isActive);
  }

  static fromRequest(req) {
    return new UpdateCustomerDto(req.body || {});
  }
}

module.exports = {
  CreateCustomerDto,
  UpdateCustomerDto,
};
