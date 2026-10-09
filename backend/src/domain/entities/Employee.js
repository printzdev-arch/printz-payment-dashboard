class Employee {
  constructor({
    id,
    _id,
    employeeCode,
    name,
    mobile,
    email,
    address = "",
    joiningDate,
    leavingDate = null,
    employmentStatus = "ACTIVE",
    isActive = true,
    branchId,
    departmentId = null,
    designationId = null,
    roleId = null,
    reportingManagerId = null,
    defaultSalary = null,
    bankDetails = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = this.id;
    this.employeeCode = employeeCode;
    this.name = name;
    this.mobile = mobile;
    this.email = email;
    this.address = address;
    this.joiningDate = joiningDate;
    this.leavingDate = leavingDate;
    this.employmentStatus = employmentStatus; // 'ACTIVE', 'INACTIVE', 'LEFT'
    this.isActive = isActive;
    this.branchId = branchId;
    this.departmentId = departmentId;
    this.designationId = designationId;
    this.roleId = roleId;
    this.reportingManagerId = reportingManagerId;
    this.defaultSalary = defaultSalary;
    this.bankDetails = bankDetails;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Employee;
