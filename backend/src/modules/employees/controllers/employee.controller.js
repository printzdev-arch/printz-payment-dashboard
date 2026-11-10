const employeeService = require("../services/employee.service");
const {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  DeactivateEmployeeDto,
} = require("../models/EmployeeDto");
const { asyncHandler, ResponseHelper } = require("../../../utils");
const { getAuthContext } = require("../../../utils/helpers/authContext.helper");

/**
 * POST /api/employees
 */
const createEmployee = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const dto = CreateEmployeeDto.fromRequest(req);
  const employee = await employeeService.createEmployee(dto, authContext.userId, authContext);
  return ResponseHelper.created(res, employee, "Employee onboarded successfully.");
});

/**
 * GET /api/employees
 */
const getEmployees = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);

  const clientFilters = {};
  if (typeof req.query.status === "string" && req.query.status.trim()) {
    clientFilters.employmentStatus = req.query.status.trim().toUpperCase();
  }
  if (typeof req.query.employmentStatus === "string" && req.query.employmentStatus.trim()) {
    clientFilters.employmentStatus = req.query.employmentStatus.trim().toUpperCase();
  }
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    clientFilters.search = req.query.q.trim();
  } else if (typeof req.query.search === "string" && req.query.search.trim()) {
    clientFilters.search = req.query.search.trim();
  }

  // Opt-in filters used by the Employees screen. They have their own names so other
  // screens that send branchId to this endpoint keep behaving as before.
  const idParam = (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
  const roleId = idParam(req.query.roleId);
  const filterBranchId = idParam(req.query.filterBranchId);
  if (roleId) clientFilters.roleId = roleId;
  if (filterBranchId) clientFilters.branchId = filterBranchId;

  const pagination = {
    page: Math.max(1, parseInt(req.query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50)),
  };

  const result = await employeeService.getEmployees(
    { scopeFilter: authContext.scopeFilter, clientFilters },
    pagination,
    authContext
  );
  return ResponseHelper.success(res, result, "Employees retrieved successfully.");
});

/**
 * GET /api/employees/roles
 * Roles that can be given to an employee (master default "Employee Roles").
 */
const getRoleOptions = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const roles = await employeeService.getRoleOptions(authContext);
  return ResponseHelper.success(res, roles, "Employee roles retrieved successfully.");
});

/**
 * GET /api/employees/:id
 */
const getEmployeeById = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const employee = await employeeService.getEmployeeById(req.params.id, authContext);
  return ResponseHelper.success(res, employee, "Employee details retrieved successfully.");
});

/**
 * PATCH /api/employees/:id
 */
const updateEmployee = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const dto = UpdateEmployeeDto.fromRequest(req);
  const updated = await employeeService.updateEmployee(req.params.id, dto, authContext.userId, authContext);
  return ResponseHelper.success(res, updated, "Employee updated successfully.");
});

/**
 * POST /api/employees/:id/deactivate
 */
const deactivateEmployee = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const dto = DeactivateEmployeeDto.fromRequest(req);
  const result = await employeeService.deactivateEmployee(req.params.id, dto, authContext);
  return ResponseHelper.success(
    res,
    result,
    "Employee deactivated and linked user disabled successfully."
  );
});

/**
 * POST /api/employees/:id/password
 */
const resetLoginPassword = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  await employeeService.resetLoginPassword(req.params.id, (req.body || {}).password, authContext);
  return ResponseHelper.success(res, null, "Password updated successfully.");
});

module.exports = {
  resetLoginPassword,
  createEmployee,
  getEmployees,
  getRoleOptions,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
};
