const employeeService = require("../services/employee.service");
const {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  DeactivateEmployeeDto,
} = require("../dto/EmployeeDto");
const { asyncHandler, ResponseHelper } = require("../utils");

/**
 * Derive auth context from the request.
 * Reads from req.authz (set by requirePermission middleware) — never trusts the request body/query.
 */
const getAuthContext = (req) => {
  const user = req.user || {};
  const userBranchIds = (user.branchIds || [])
    .map((b) => (b._id ? b._id.toString() : b.toString()))
    .filter(Boolean);

  if (user.branchId) {
    const sId = user.branchId._id ? user.branchId._id.toString() : user.branchId.toString();
    if (!userBranchIds.includes(sId)) userBranchIds.push(sId);
  }

  const isSuperAdmin = Boolean(
    req.authz?.isSuperAdmin ||
    user.role === "admin" ||
    user.role === "SUPER_ADMIN" ||
    user.roleCode === "SUPER_ADMIN" ||
    user.roleCode === "ADMIN" ||
    user.roleCode === "INTERNAL_ADMIN"
  );

  return {
    isSuperAdmin,
    authorizedBranchIds: req.authz?.userBranchIds || userBranchIds,
    scopes: req.authz?.scopes || (isSuperAdmin ? ["ALL"] : ["BRANCH"]),
    scopeFilter: req.authz?.scopeFilter,
    userId: (user._id || user.id || "").toString(),
    employeeId: user.employeeId ? user.employeeId.toString() : null,
  };
};

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

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
};
