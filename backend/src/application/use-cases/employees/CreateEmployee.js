const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const Department = require("../../../infrastructure/database/mongoose/models/Department");
const Designation = require("../../../infrastructure/database/mongoose/models/Designation");
const Employee = require("../../../infrastructure/database/mongoose/models/Employee");
const auditService = require("../../../infrastructure/audit/AuditService");

class CreateEmployee {
  constructor({ employeeRepository }) {
    this.employeeRepository = employeeRepository;
  }

  async execute(dto, createdByUserId, authContext = {}) {
    if (!dto.name || !dto.mobile || !dto.email || !dto.branchId) {
      throw ErrorHelper.badRequest("Name, mobile, email, and branchId are required.");
    }

    const joiningDate = dto.joiningDate ? new Date(dto.joiningDate) : new Date();
    dto.joiningDate = joiningDate;

    if (!/^\d{10}$/.test(String(dto.mobile).trim())) {
      throw ErrorHelper.badRequest("Mobile number must be exactly 10 digits.");
    }

    const existingEmail = await this.employeeRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw ErrorHelper.conflict(`Employee with email '${dto.email}' already exists.`);
    }

    // 1. Validate Leaving Date
    if (dto.leavingDate) {
      const leavingDate = new Date(dto.leavingDate);
      if (leavingDate < joiningDate) {
        throw ErrorHelper.badRequest("Leaving date cannot be earlier than joining date.");
      }
    }

    // 2. Validate Department
    let departmentDoc = null;
    if (dto.departmentId) {
      if (!mongoose.Types.ObjectId.isValid(dto.departmentId)) {
        throw ErrorHelper.badRequest("Invalid departmentId format.");
      }
      departmentDoc = await Department.findById(dto.departmentId);
      if (!departmentDoc || !departmentDoc.isActive) {
        throw ErrorHelper.badRequest("Department does not exist or is inactive.");
      }
    }

    // 3. Validate Designation
    if (dto.designationId) {
      if (!mongoose.Types.ObjectId.isValid(dto.designationId)) {
        throw ErrorHelper.badRequest("Invalid designationId format.");
      }
      const designationDoc = await Designation.findById(dto.designationId);
      if (!designationDoc || !designationDoc.isActive) {
        throw ErrorHelper.badRequest("Designation does not exist or is inactive.");
      }

      // Check designation belongs to department when both are provided
      if (dto.departmentId && designationDoc.departmentId) {
        if (designationDoc.departmentId.toString() !== dto.departmentId.toString()) {
          throw ErrorHelper.badRequest("Selected designation does not belong to the specified department.");
        }
      }
    }

    // 4. Validate Reporting Manager
    if (dto.reportingManagerId) {
      if (!mongoose.Types.ObjectId.isValid(dto.reportingManagerId)) {
        throw ErrorHelper.badRequest("Invalid reportingManagerId format.");
      }
      const manager = await Employee.findById(dto.reportingManagerId);
      if (!manager) {
        throw ErrorHelper.badRequest("Reporting manager does not exist.");
      }
      if (manager.employmentStatus !== "ACTIVE" || !manager.isActive) {
        throw ErrorHelper.badRequest("Reporting manager must be an ACTIVE employee.");
      }
    }

    // 5. Create employee and initial branch assignment in repository transaction
    const employee = await this.employeeRepository.createWithAssignment(dto, createdByUserId, authContext);

    // 6. Audit Log
    await auditService.log({
      event: "EMPLOYEE_CREATED",
      action: "EMPLOYEE_CREATE",
      userId: createdByUserId,
      resourceType: "Employee",
      resourceId: employee._id,
      branchId: employee.branchId,
      after: {
        _id: employee._id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        designationId: employee.designationId,
        roleId: employee.roleId,
        reportingManagerId: employee.reportingManagerId,
        employmentStatus: employee.employmentStatus,
      },
      status: "SUCCESS",
    });

    return employee;
  }
}

module.exports = CreateEmployee;
