/**
 * Design Allocation DTOs (Module 07)
 */

class AssignDesignerDto {
  constructor(data = {}) {
    this.method = data.method || "ROUND_ROBIN"; // ROUND_ROBIN, MANUAL
    this.employeeId = data.employeeId || null;
  }
}

class ReassignDesignerDto {
  constructor(data = {}) {
    this.target = data.target || "ROUND_ROBIN"; // employeeId or "ROUND_ROBIN"
    this.reason = data.reason || "Reassigned by manager";
  }
}

module.exports = {
  AssignDesignerDto,
  ReassignDesignerDto,
};
