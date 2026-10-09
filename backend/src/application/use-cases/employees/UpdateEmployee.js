const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const Department = require("../../../infrastructure/database/mongoose/models/Department");
const Designation = require("../../../infrastructure/database/mongoose/models/Designation");
const Employee = require("../../../infrastructure/database/mongoose/models/Employee");
const auditService = require("../../../infrastructure/audit/AuditService");

class UpdateEmployee {
  constructor({ employeeRepository }) {
    this.employeeRepository = employeeRepository;
  }

  async execute(id, dto, modifiedByUserId, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.notFound("Employee not found.");
    }

    const existingEmployee = await Employee.findById(id);
    if (!existingEmployee) {
      throw ErrorHelper.notFound("Employee not found.");
    }

    // 1. Validate Department
    if (dto.departmentId !== undefined) {
      if (dto.departmentId && !mongoose.Types.ObjectId.isValid(dto.departmentId)) {
        throw ErrorHelper.badRequest("Invalid departmentId format.");
      }
      if (dto.departmentId) {
        const department = await Department.findById(dto.departmentId);
        if (!department || !department.isActive) {
          throw ErrorHelper.badRequest("Department does not exist or is inactive.");
        }
      }
    }

    // 2. Validate Designation
    if (dto.designationId !== undefined) {
      if (dto.designationId && !mongoose.Types.ObjectId.isValid(dto.designationId)) {
        throw ErrorHelper.badRequest("Invalid designationId format.");
      }
      if (dto.designationId) {
        const designation = await Designation.findById(dto.designationId);
        if (!designation || !designation.isActive) {
          throw ErrorHelper.badRequest("Designation does not exist or is inactive.");
        }
      }
    }

    // 3. Validate Reporting Manager & Loop Detection
    if (dto.reportingManagerId !== undefined && dto.reportingManagerId !== null) {
      const mgrIdStr = dto.reportingManagerId._id
        ? dto.reportingManagerId._id.toString()
        : dto.reportingManagerId.toString();

      if (!mongoose.Types.ObjectId.isValid(mgrIdStr)) {
        throw ErrorHelper.badRequest("Invalid reportingManagerId format.");
      }

      // Check self-reference
      if (mgrIdStr === id.toString()) {
        throw ErrorHelper.badRequest("An employee cannot be their own reporting manager.");
      }

      const manager = await Employee.findById(mgrIdStr);
      if (!manager) {
        throw ErrorHelper.badRequest("Reporting manager does not exist.");
      }
      if (manager.employmentStatus !== "ACTIVE" || !manager.isActive) {
        throw ErrorHelper.badRequest("Reporting manager must be an ACTIVE employee.");
      }

      // Detect hierarchy loops (e.g. A -> B -> C -> A)
      let currentManagerId = manager.reportingManagerId;
      const visitedIds = new Set([id.toString(), mgrIdStr]);

      while (currentManagerId) {
        const currentStr = currentManagerId.toString();
        if (currentStr === id.toString()) {
          throw ErrorHelper.conflict("Reporting hierarchy loop detected. A circular management chain is not allowed.");
        }
        if (visitedIds.has(currentStr)) {
          break; // Cycle detected in existing data elsewhere, break to avoid infinite loop
        }
        visitedIds.add(currentStr);

        const nextManager = await Employee.findById(currentStr).select("reportingManagerId").lean();
        currentManagerId = nextManager ? nextManager.reportingManagerId : null;
      }
    }

    const beforeState = existingEmployee.toObject();
    const isBranchTransfer =
      dto.branchId &&
      existingEmployee.branchId &&
      dto.branchId.toString() !== existingEmployee.branchId.toString();

    const updated = await this.employeeRepository.updateWithTransfer(id, dto, modifiedByUserId, authContext);
    if (!updated) {
      throw ErrorHelper.notFound("Employee not found.");
    }

    // 4. Audit Log
    await auditService.log({
      event: isBranchTransfer ? "EMPLOYEE_BRANCH_TRANSFERRED" : "EMPLOYEE_UPDATED",
      action: isBranchTransfer ? "EMPLOYEE_BRANCH_TRANSFER" : "EMPLOYEE_UPDATE",
      userId: modifiedByUserId,
      resourceType: "Employee",
      resourceId: updated._id,
      branchId: updated.branchId,
      before: {
        branchId: beforeState.branchId,
        roleId: beforeState.roleId,
        departmentId: beforeState.departmentId,
        designationId: beforeState.designationId,
        reportingManagerId: beforeState.reportingManagerId,
      },
      after: {
        branchId: updated.branchId,
        roleId: updated.roleId,
        departmentId: updated.departmentId,
        designationId: updated.designationId,
        reportingManagerId: updated.reportingManagerId,
      },
      status: "SUCCESS",
    });

    return updated;
  }
}

module.exports = UpdateEmployee;

