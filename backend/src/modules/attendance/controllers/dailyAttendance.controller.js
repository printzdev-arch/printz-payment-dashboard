const dailyAttendanceService = require("../services/dailyAttendance.service");
const attendanceReconciliationService = require("../services/attendanceReconciliation.service");
const { asyncHandler, ResponseHelper } = require("../../../utils");

const getAuthContext = (req) => {
  const user = req.user || {};
  const userBranchIds = (user.branchIds || [])
    .map((b) => (b._id ? b._id.toString() : b.toString()))
    .filter(Boolean);

  if (user.branchId) {
    const sId = user.branchId._id ? user.branchId._id.toString() : user.branchId.toString();
    if (!userBranchIds.includes(sId)) userBranchIds.push(sId);
  }

  const roleNorm = (user.roleCode || user.role || "").toString().toLowerCase().trim();
  const isSuperAdmin = Boolean(
    req.authz?.isSuperAdmin ||
    roleNorm === "super_admin" ||
    roleNorm === "internal_admin" ||
    (user.permissions && user.permissions.includes("*")) ||
    (roleNorm === "admin" && userBranchIds.length === 0)
  );

  const effectiveBranchIds =
    req.authz?.userBranchIds && req.authz.userBranchIds.length > 0
      ? req.authz.userBranchIds
      : userBranchIds;

  return {
    isSuperAdmin,
    authorizedBranchIds: effectiveBranchIds,
    scopes: req.authz?.scopes || (isSuperAdmin ? ["ALL"] : ["BRANCH"]),
    userId: (user._id || user.id || "").toString(),
    employeeId: user.employeeId ? user.employeeId.toString() : null,
    role: user.roleCode || user.role || "EMPLOYEE",
  };
};

/**
 * GET /api/attendance
 */
const getAttendance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const filters = {
    branchId: req.query.branchId,
    employeeId: req.query.employeeId,
    attendanceDate: req.query.attendanceDate || req.query.date,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    status: req.query.status,
    lateArrival: req.query.lateArrival,
    earlyCheckout: req.query.earlyCheckout,
  };

  const pagination = {
    page: Math.max(1, parseInt(req.query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50)),
  };

  const result = await dailyAttendanceService.getAttendance(filters, pagination, authContext);
  return ResponseHelper.cleanOk(res, "Attendance records retrieved successfully.", result);
});

/**
 * GET /api/attendance/summary
 */
const getAttendanceSummary = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const filters = {
    branchId: req.query.branchId,
    date: req.query.date || req.query.attendanceDate,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    employeeId: req.query.employeeId,
    month: req.query.month,
    year: req.query.year,
  };

  const summary = await dailyAttendanceService.getAttendanceSummary(filters, authContext);
  return ResponseHelper.cleanOk(res, "Attendance summary calculated successfully.", summary);
});

/**
 * GET /api/attendance/employees-for-date
 */
const getEmployeesForDate = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const { branchId, attendanceDate, date, departmentId } = req.query;
  const targetDate = attendanceDate || date;

  const result = await attendanceReconciliationService.getEmployeesForDate(
    { branchId, attendanceDate: targetDate, departmentId },
    authContext
  );
  return ResponseHelper.cleanOk(res, "Employees and attendance status for date retrieved successfully.", result);
});

/**
 * GET /api/attendance/missing
 */
const getMissingAttendance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const { branchId, attendanceDate, date, departmentId } = req.query;
  const targetDate = attendanceDate || date;

  const result = await attendanceReconciliationService.getMissingAttendance(
    { branchId, attendanceDate: targetDate, departmentId },
    authContext
  );
  return ResponseHelper.cleanOk(res, "Missing attendance list retrieved successfully.", result);
});

/**
 * POST /api/attendance/reconcile
 */
const reconcileAttendance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await attendanceReconciliationService.reconcileAttendance(
    req.body,
    authContext.userId,
    authContext
  );
  return ResponseHelper.cleanOk(res, "Attendance reconciled successfully.", result);
});

/**
 * GET /api/attendance/:id
 */
const getAttendanceById = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const record = await dailyAttendanceService.getAttendanceById(req.params.id, authContext);
  return ResponseHelper.cleanOk(res, "Attendance record retrieved successfully.", record);
});

/**
 * POST /api/attendance/check-in
 * Branch Manager Web & Mobile App Check-In Action
 */
const recordCheckIn = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await dailyAttendanceService.recordCheckIn(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanCreated(res, result, "Employee check-in recorded successfully.");
});

/**
 * POST /api/attendance/check-out
 * Branch Manager Web & Mobile App Check-Out Action
 */
const recordCheckOut = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await dailyAttendanceService.recordCheckOut(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Employee check-out recorded and calculated successfully.", result);
});

/**
 * POST /api/attendance/batch-punch
 * Branch Manager Web & Mobile App Batch Punch Action (Check-in/Check-out multiple staff)
 */
const batchPunch = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await dailyAttendanceService.batchPunch(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, `Batch ${req.body.type || "punch"} completed successfully.`, result);
});

/**
 * POST /api/attendance
 */
const createAttendance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const created = await dailyAttendanceService.createAttendance(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanCreated(res, created, "Attendance recorded successfully.");
});

/**
 * PUT /api/attendance/:id
 */
const updateAttendance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const updated = await dailyAttendanceService.updateAttendance(req.params.id, req.body, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Attendance record updated successfully.", updated);
});

/**
 * DELETE /api/attendance/:id
 */
const deleteAttendance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await dailyAttendanceService.deleteAttendance(req.params.id, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Attendance record deleted successfully.", result);
});

/**
 * POST /api/attendance/finalize
 * Finalize / Lock attendance records for a branch
 */
const finalizeAttendance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await dailyAttendanceService.finalizeAttendance(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Attendance records finalized and locked successfully.", result);
});

/**
 * POST /api/attendance/reopen
 * Reopen / Unlock attendance records for a branch (Super Admin only)
 */
const reopenAttendance = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await dailyAttendanceService.reopenAttendance(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Attendance records reopened successfully.", result);
});

/**
 * POST /api/attendance/generate-holidays
 * Controlled generation of holiday attendance records for active employees (Admin only)
 */
const generateHolidayAttendanceRecords = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await dailyAttendanceService.generateHolidayAttendanceRecords(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanCreated(res, result, "Holiday attendance records generated successfully.");
});

module.exports = {
  getAttendance,
  getAttendanceSummary,
  getEmployeesForDate,
  getMissingAttendance,
  reconcileAttendance,
  recordCheckIn,
  recordCheckOut,
  batchPunch,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  finalizeAttendance,
  reopenAttendance,
  generateHolidayAttendanceRecords,
};


