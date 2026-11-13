const holidayCalendarService = require("../services/holidayCalendar.service");
const { asyncHandler, ResponseHelper } = require("../../../utils");

const getAuthContext = (req) => {
  const user = req.user || {};
  const userBranchIds = (user.branchIds || [])
    .filter(Boolean).map((b) => (b._id ? b._id.toString() : b.toString()))
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
    (Array.isArray(user.permissions) && user.permissions.includes("*")) ||
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
 * GET /api/holiday-calendars
 */
const getCalendars = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const filters = {
    year: req.query.year,
    branchId: req.query.branchId,
    isActive: req.query.isActive !== undefined ? req.query.isActive : req.query.status,
  };

  const pagination = {
    page: Math.max(1, parseInt(req.query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50)),
  };

  const result = await holidayCalendarService.getCalendars(filters, pagination, authContext);
  return ResponseHelper.cleanOk(res, "Holiday calendars retrieved successfully.", result);
});

/**
 * GET /api/holiday-calendars/:id
 */
const getCalendarById = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const calendar = await holidayCalendarService.getCalendarById(req.params.id, authContext);
  return ResponseHelper.cleanOk(res, "Holiday calendar retrieved successfully.", calendar);
});

/**
 * POST /api/holiday-calendars
 */
const createCalendar = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const calendar = await holidayCalendarService.createCalendar(req.body, authContext.userId, authContext);
  return ResponseHelper.cleanCreated(res, calendar, "Holiday calendar created successfully.");
});

/**
 * PUT /api/holiday-calendars/:id
 */
const updateCalendar = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const updated = await holidayCalendarService.updateCalendar(req.params.id, req.body, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Holiday calendar updated successfully.", updated);
});

/**
 * PATCH /api/holiday-calendars/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const isActive = req.body.isActive !== undefined ? req.body.isActive : (req.body.status === "ACTIVE" || req.body.status === true);
  const updated = await holidayCalendarService.updateStatus(req.params.id, isActive, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, `Holiday calendar ${isActive ? "activated" : "deactivated"} successfully.`, updated);
});

/**
 * DELETE /api/holiday-calendars/:id
 */
const deleteCalendar = asyncHandler(async (req, res) => {
  const authContext = getAuthContext(req);
  const result = await holidayCalendarService.deleteCalendar(req.params.id, authContext.userId, authContext);
  return ResponseHelper.cleanOk(res, "Holiday calendar deleted successfully.", result);
});

module.exports = {
  getCalendars,
  getCalendarById,
  createCalendar,
  updateCalendar,
  updateStatus,
  deleteCalendar,
};

