class CreateEmployeeDto {
  constructor(data) {
    this.name = data.name;
    this.mobile = data.mobile;
    this.email = data.email;
    this.address = data.address || "";
    this.joiningDate = data.joiningDate;
    this.branchId = data.branchId;
    this.departmentId = data.departmentId || null;
    this.designationId = data.designationId || null;
    this.roleId = data.roleId || null;
    this.reportingManagerId = data.reportingManagerId || null;
    this.defaultSalary = data.defaultSalary ? Number(data.defaultSalary) : null;
    this.bankDetails = data.bankDetails || null;
  }

  static fromRequest(req) {
    return new CreateEmployeeDto(req.body || {});
  }
}

class UpdateEmployeeDto {
  constructor(data) {
    if (data.name !== undefined) this.name = data.name;
    if (data.mobile !== undefined) this.mobile = data.mobile;
    if (data.email !== undefined) this.email = data.email;
    if (data.address !== undefined) this.address = data.address;
    if (data.branchId !== undefined) this.branchId = data.branchId;
    if (data.departmentId !== undefined) this.departmentId = data.departmentId;
    if (data.designationId !== undefined) this.designationId = data.designationId;
    if (data.roleId !== undefined) this.roleId = data.roleId;
    if (data.reportingManagerId !== undefined) this.reportingManagerId = data.reportingManagerId;
    if (data.defaultSalary !== undefined) this.defaultSalary = Number(data.defaultSalary);
    if (data.bankDetails !== undefined) this.bankDetails = data.bankDetails;
    if (data.employmentStatus !== undefined) this.employmentStatus = data.employmentStatus;
    if (data.isActive !== undefined) this.isActive = Boolean(data.isActive);
  }

  static fromRequest(req) {
    return new UpdateEmployeeDto(req.body || {});
  }
}

class DeactivateEmployeeDto {
  constructor(data) {
    this.reason = data.reason || "Administrative offboarding";
    this.leftCompany = Boolean(data.leftCompany);
  }

  static fromRequest(req) {
    return new DeactivateEmployeeDto(req.body || {});
  }
}

module.exports = {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  DeactivateEmployeeDto,
};
