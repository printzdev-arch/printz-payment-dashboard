class EmployeeBranchAssignment {
  constructor({
    id,
    _id,
    employeeId,
    branchId,
    roleId = null,
    fromDate,
    toDate = null,
    isPrimary = true,
    createdBy,
    createdAt = new Date(),
  }) {
    this.id = id || _id;
    this._id = this.id;
    this.employeeId = employeeId;
    this.branchId = branchId;
    this.roleId = roleId;
    this.fromDate = fromDate;
    this.toDate = toDate;
    this.isPrimary = isPrimary;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
  }
}

module.exports = EmployeeBranchAssignment;
