const departmentService = require("../../services/common/department.service");
const { asyncHandler, ResponseHelper } = require("../../utils");

const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.createDepartment(req.body || {}, req.user);
  return ResponseHelper.created(res, department, "Department created successfully.");
});

const getDepartments = asyncHandler(async (req, res) => {
  const departments = await departmentService.getDepartments(req.query);
  return ResponseHelper.success(res, departments, "Departments retrieved successfully.");
});

const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await departmentService.getDepartmentById(req.params.id);
  return ResponseHelper.success(res, department, "Department retrieved successfully.");
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.updateDepartment(req.params.id, req.body || {}, req.user);
  return ResponseHelper.success(res, department, "Department updated successfully.");
});

const deactivateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.deactivateDepartment(req.params.id, req.user);
  return ResponseHelper.success(res, department, "Department deactivated successfully.");
});

const activateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.activateDepartment(req.params.id, req.user);
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
