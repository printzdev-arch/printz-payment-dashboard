const employeeShiftService = require("../services/employeeShift.service");
const { asyncHandler, ResponseHelper } = require("../../../utils");
const { getAuthContext } = require("../../../utils/helpers/authContext.helper");

/**
 * POST /api/employees/:id/shifts
 */
const createBranchShift = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const shift = await employeeShiftService.createBranchShift(
    req.params.id,
    req.body,
    authContext.userId,
    authContext
  );
  return ResponseHelper.created(res, shift, "Employee branch shift scheduled and approved successfully.");
});

/**
 * GET /api/employees/shifts or GET /api/employees/:id/shifts
 */
const getBranchShifts = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const filters = {
    employeeId: req.params.id || req.query.employeeId,
    branchId: req.query.branchId,
    status: req.query.status,
    date: req.query.date,
    search: req.query.search || req.query.q,
  };
  const pagination = {
    page: Math.max(1, parseInt(req.query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50)),
  };
  const result = await employeeShiftService.getBranchShifts(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Employee branch shifts retrieved successfully.");
});

/**
 * POST /api/employees/shifts/:shiftId/cancel
 */
const cancelBranchShift = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const { reason = "" } = req.body;
  const result = await employeeShiftService.cancelBranchShift(
    req.params.shiftId,
    reason,
    authContext.userId,
    authContext
  );
  return ResponseHelper.success(res, result, "Employee branch shift cancelled successfully.");
});

/**
 * POST /api/employees/shifts/:shiftId/end-early
 */
const endBranchShiftEarly = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const { effectiveDate } = req.body;
  const result = await employeeShiftService.endBranchShiftEarly(
    req.params.shiftId,
    effectiveDate,
    authContext.userId,
    authContext
  );
  return ResponseHelper.success(res, result, "Employee branch shift ended early successfully.");
});

module.exports = {
  createBranchShift,
  getBranchShifts,
  cancelBranchShift,
  endBranchShiftEarly,
};
