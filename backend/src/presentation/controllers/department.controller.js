const mongoose = require("mongoose");
const Department = require("../../infrastructure/database/mongoose/models/Department");
const Employee = require("../../infrastructure/database/mongoose/models/Employee");
const auditService = require("../../infrastructure/audit/AuditService");
const { asyncHandler, ResponseHelper } = require("../../shared");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, isActive } = req.body || {};
  if (!name || !code) {
    throw ErrorHelper.badRequest("Department name and code are required.");
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = await Department.findOne({ code: normalizedCode });
  if (existing) {
    throw ErrorHelper.conflict(`Department with code '${normalizedCode}' already exists.`);
  }

  const department = await Department.create({
    name: name.trim(),
    code: normalizedCode,
    description: description ? description.trim() : "",
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  await auditService.log({
    event: "DEPARTMENT_CREATED",
    action: "DEPARTMENT_CREATE",
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    resourceType: "Department",
    resourceId: department._id,
    after: department.toObject(),
    status: "SUCCESS",
  });

  return ResponseHelper.created(res, department, "Department created successfully.");
});

const getDepartments = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  }
  const departments = await Department.find(query).sort({ name: 1 }).lean();
  return ResponseHelper.success(res, departments, "Departments retrieved successfully.");
});

const getDepartmentById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ErrorHelper.notFound("Department not found.");
  }
  const department = await Department.findById(req.params.id).lean();
  if (!department) {
    throw ErrorHelper.notFound("Department not found.");
  }
  return ResponseHelper.success(res, department, "Department retrieved successfully.");
});

const updateDepartment = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ErrorHelper.notFound("Department not found.");
  }

  const department = await Department.findById(req.params.id);
  if (!department) {
    throw ErrorHelper.notFound("Department not found.");
  }

  const { name, code, description, isActive } = req.body || {};
  const beforeState = department.toObject();

  if (code) {
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode !== department.code) {
      const existing = await Department.findOne({
        code: normalizedCode,
        _id: { $ne: department._id },
      });
      if (existing) {
        throw ErrorHelper.conflict(`Department with code '${normalizedCode}' already exists.`);
      }
      department.code = normalizedCode;
    }
  }

  if (name !== undefined) department.name = name.trim();
  if (description !== undefined) department.description = description.trim();
  if (isActive !== undefined) {
    if (!isActive && department.isActive) {
      // Check if active employees are assigned to this department
      const activeEmployeeCount = await Employee.countDocuments({
        departmentId: department._id,
        employmentStatus: "ACTIVE",
        isActive: true,
      });
      if (activeEmployeeCount > 0) {
        throw ErrorHelper.conflict(
          `Cannot deactivate department: ${activeEmployeeCount} active employee(s) are assigned to this department.`
        );
      }
    }
    department.isActive = Boolean(isActive);
  }

  await department.save();

  await auditService.log({
    event: "DEPARTMENT_UPDATED",
    action: "DEPARTMENT_UPDATE",
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    resourceType: "Department",
    resourceId: department._id,
    before: beforeState,
    after: department.toObject(),
    status: "SUCCESS",
  });

  return ResponseHelper.success(res, department, "Department updated successfully.");
});

const deactivateDepartment = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ErrorHelper.notFound("Department not found.");
  }

  const department = await Department.findById(req.params.id);
  if (!department) {
    throw ErrorHelper.notFound("Department not found.");
  }

  const activeEmployeeCount = await Employee.countDocuments({
    departmentId: department._id,
    employmentStatus: "ACTIVE",
    isActive: true,
  });

  if (activeEmployeeCount > 0) {
    throw ErrorHelper.conflict(
      `Cannot deactivate department: ${activeEmployeeCount} active employee(s) are assigned to this department.`
    );
  }

  const beforeState = department.toObject();
  department.isActive = false;
  await department.save();

  await auditService.log({
    event: "DEPARTMENT_DEACTIVATED",
    action: "DEPARTMENT_DEACTIVATE",
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    resourceType: "Department",
    resourceId: department._id,
    before: beforeState,
    after: department.toObject(),
    status: "SUCCESS",
  });

  return ResponseHelper.success(res, department, "Department deactivated successfully.");
});

const activateDepartment = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ErrorHelper.notFound("Department not found.");
  }

  const department = await Department.findById(req.params.id);
  if (!department) {
    throw ErrorHelper.notFound("Department not found.");
  }

  const beforeState = department.toObject();
  department.isActive = true;
  await department.save();

  await auditService.log({
    event: "DEPARTMENT_ACTIVATED",
    action: "DEPARTMENT_ACTIVATE",
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    resourceType: "Department",
    resourceId: department._id,
    before: beforeState,
    after: department.toObject(),
    status: "SUCCESS",
  });

  return ResponseHelper.success(res, department, "Department activated successfully.");
});

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deactivateDepartment,
  activateDepartment,
};
