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
    this.gstin = typeof data.gstin === "string" ? data.gstin.trim().toUpperCase() : null;
    this.address = typeof data.address === "string" ? data.address.trim() : null;
    this.customerType = typeof data.customerType === "string" ? data.customerType.trim().toUpperCase() : "WALK_IN";
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
    if (data.gstin !== undefined) this.gstin = typeof data.gstin === "string" ? data.gstin.trim().toUpperCase() : data.gstin;
    if (data.address !== undefined) this.address = typeof data.address === "string" ? data.address.trim() : data.address;
    if (data.customerType !== undefined) this.customerType = typeof data.customerType === "string" ? data.customerType.trim().toUpperCase() : data.customerType;
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
