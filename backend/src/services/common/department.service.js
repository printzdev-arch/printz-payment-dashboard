const mongoose = require("mongoose");
const Department = require("../../models/common/Department");
const Employee = require("../../models/auth/Employee");
const AuditHelper = require("../../utils/helpers/common/AuditHelper");
const ApiError = require("../../utils/ApiError");

class DepartmentService {
  async createDepartment({ name, code, description, isActive }, user = {}) {
    if (!name || !code) {
      throw ApiError.badRequest("Department name and code are required.");
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await Department.findOne({ code: normalizedCode });
    if (existing) {
      throw ApiError.conflict(`Department with code '${normalizedCode}' already exists.`);
    }

    const department = await Department.create({
      name: name.trim(),
      code: normalizedCode,
      description: description ? description.trim() : "",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await AuditHelper.log({
      action: "DEPARTMENT_CREATE",
      actorId: user._id || user.id,
      actorName: user.email,
      entityType: "DEPARTMENT",
      entityId: department._id,
      after: department.toObject ? department.toObject() : department,
    });

    return department;
  }

  async getDepartments(queryFilter = {}) {
    const query = {};
    if (queryFilter.isActive !== undefined) {
      query.isActive = queryFilter.isActive === "true" || queryFilter.isActive === true;
    }
    return Department.find(query).sort({ name: 1 }).lean();
  }

  async getDepartmentById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Department not found.");
    }
    const department = await Department.findById(id).lean();
    if (!department) {
      throw ApiError.notFound("Department not found.");
    }
    return department;
  }

  async updateDepartment(id, { name, code, description, isActive }, user = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Department not found.");
    }

    const department = await Department.findById(id);
    if (!department) {
      throw ApiError.notFound("Department not found.");
    }

    const beforeState = department.toObject();

    if (code) {
      const normalizedCode = code.trim().toUpperCase();
      if (normalizedCode !== department.code) {
        const existing = await Department.findOne({
          code: normalizedCode,
          _id: { $ne: department._id },
        });
        if (existing) {
          throw ApiError.conflict(`Department with code '${normalizedCode}' already exists.`);
        }
        department.code = normalizedCode;
      }
    }

    if (name !== undefined) department.name = name.trim();
    if (description !== undefined) department.description = description.trim();
    if (isActive !== undefined) {
      if (!isActive && department.isActive) {
        const activeEmployeeCount = await Employee.countDocuments({
          departmentId: department._id,
          employmentStatus: "ACTIVE",
          isActive: true,
        });
        if (activeEmployeeCount > 0) {
          throw ApiError.conflict(
            `Cannot deactivate department: ${activeEmployeeCount} active employee(s) are assigned to this department.`
          );
        }
      }
      department.isActive = Boolean(isActive);
    }

    await department.save();

    await AuditHelper.log({
      action: "DEPARTMENT_UPDATE",
      actorId: user._id || user.id,
      actorName: user.email,
      entityType: "DEPARTMENT",
      entityId: department._id,
      before: beforeState,
      after: department.toObject(),
    });

    return department;
  }

  async deactivateDepartment(id, user = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Department not found.");
    }

    const department = await Department.findById(id);
    if (!department) {
      throw ApiError.notFound("Department not found.");
    }

    const activeEmployeeCount = await Employee.countDocuments({
      departmentId: department._id,
      employmentStatus: "ACTIVE",
      isActive: true,
    });

    if (activeEmployeeCount > 0) {
      throw ApiError.conflict(
        `Cannot deactivate department: ${activeEmployeeCount} active employee(s) are assigned to this department.`
      );
    }

    const beforeState = department.toObject();
    department.isActive = false;
    await department.save();

    await AuditHelper.log({
      action: "DEPARTMENT_DEACTIVATE",
      actorId: user._id || user.id,
      actorName: user.email,
      entityType: "DEPARTMENT",
      entityId: department._id,
      before: beforeState,
      after: department.toObject(),
    });

    return department;
  }

  async activateDepartment(id, user = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Department not found.");
    }

    const department = await Department.findById(id);
    if (!department) {
      throw ApiError.notFound("Department not found.");
    }

    const beforeState = department.toObject();
    department.isActive = true;
    await department.save();

    await AuditHelper.log({
      action: "DEPARTMENT_ACTIVATE",
      actorId: user._id || user.id,
      actorName: user.email,
      entityType: "DEPARTMENT",
      entityId: department._id,
      before: beforeState,
      after: department.toObject(),
    });

    return department;
  }
}

module.exports = new DepartmentService();
