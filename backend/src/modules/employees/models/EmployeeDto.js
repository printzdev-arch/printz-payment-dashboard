const { sanitizePageAccess, sanitizePageActions } = require("../../auth/constants/pageCatalog");

class CreateEmployeeDto {
  constructor(data) {
    this.name = data.name;
    this.mobile = data.mobile;
    this.email = data.email;
    this.address = data.address || "";
    this.joiningDate = data.joiningDate;
    this.dateOfBirth = data.dateOfBirth || null;
    this.branchId = data.branchId;
    this.roleId = data.roleId || null;
    this.reportingManagerId = data.reportingManagerId || null;
    this.defaultSalary = data.defaultSalary ? Number(data.defaultSalary) : null;
    this.bankDetails = data.bankDetails || null;
    if (data.leavingDate) this.leavingDate = data.leavingDate;
    if (data.pageAccess !== undefined && data.pageAccess !== null) this.pageAccess = sanitizePageAccess(data.pageAccess);
    if (data.pageActions && typeof data.pageActions === "object") this.pageActions = sanitizePageActions(data.pageActions);
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
    if (data.dateOfBirth !== undefined) this.dateOfBirth = data.dateOfBirth || null;
    if (data.branchId !== undefined) this.branchId = data.branchId;
    if (data.roleId !== undefined) this.roleId = data.roleId;
    if (data.reportingManagerId !== undefined) this.reportingManagerId = data.reportingManagerId;
    if (data.defaultSalary !== undefined) this.defaultSalary = Number(data.defaultSalary);
    if (data.bankDetails !== undefined) this.bankDetails = data.bankDetails;
    if (data.leavingDate !== undefined) this.leavingDate = data.leavingDate || null;
    if (data.employmentStatus !== undefined) this.employmentStatus = data.employmentStatus;
    if (data.isActive !== undefined) this.isActive = Boolean(data.isActive);
    // { reason } records why a person has pages beyond their role's; null clears it
    if (data.extraPages === null) this.extraPages = null;
    else if (data.extraPages !== undefined) this.extraPages = { reason: String((data.extraPages && data.extraPages.reason) || "").trim() };
    // { reason } records why a person on a no-login role may sign in; null clears it
    if (data.loginException === null) this.loginException = null;
    else if (data.loginException !== undefined) this.loginException = { reason: String((data.loginException && data.loginException.reason) || "").trim() };
    // null puts the employee back on their role's pages
    if (data.pageAccess === null) this.pageAccess = null;
    else if (data.pageAccess !== undefined) this.pageAccess = sanitizePageAccess(data.pageAccess);
    // null removes this person's own actions (their role's apply again)
    if (data.pageActions === null) this.pageActions = null;
    else if (data.pageActions !== undefined) this.pageActions = sanitizePageActions(data.pageActions) || {};
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
