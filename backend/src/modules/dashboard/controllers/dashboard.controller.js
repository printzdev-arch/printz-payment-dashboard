const mongoose = require("mongoose");
const { dashboardService } = require("../services/dashboard.service");
const { asyncHandler, ResponseHelper, ApiError } = require("../../../utils");
const TtlCache = require("../../../utils/helpers/ttlCache");

// A dashboard runs a dozen aggregations, so identical requests within this window share one result.
// Add ?refresh=true to a request to bypass the cache and force a fresh read.
const DASHBOARD_TTL_MS = Number(process.env.DASHBOARD_CACHE_TTL_MS) || 60 * 1000;
const dashboardCache = new TtlCache({ ttlMs: DASHBOARD_TTL_MS, maxEntries: 300 });
const inFlight = new Map();

/**
 * Run `loader` once per user + scope + query. The key includes who is asking and which branches they may see,
 * so one user's numbers are never served to someone with different access.
 */
const cachedDashboard = async (kind, req, authContext, params, loader) => {
  const refresh = String(req.query.refresh || "").toLowerCase() === "true";
  const userId = String(authContext.user?._id || authContext.user?.id || "");
  const key = JSON.stringify([
    kind,
    userId,
    [...(authContext.scopes || [])].sort(),
    [...(authContext.authorizedBranchIds || [])].map(String).sort(),
    params,
  ]);

  if (!refresh) {
    const hit = dashboardCache.get(key);
    if (hit !== undefined) return hit;
    if (inFlight.has(key)) return inFlight.get(key);
  }

  const pending = loader()
    .then((result) => {
      dashboardCache.set(key, result);
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
};

function extractAuthContext(req) {
  const user = req.user || {};
  const userBranchIds = (user.branchIds || [])
    .map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
    .filter(Boolean);

  if (user.branchId) {
    const sId = user.branchId._id ? user.branchId._id.toString() : user.branchId.toString();
    if (!userBranchIds.includes(sId)) userBranchIds.push(sId);
  }

  const role = String(user.role || user.roleCode || "").toUpperCase();
  const isSuperAdmin = Boolean(
    req.authz?.isSuperAdmin ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    (req.authz?.scopes || []).includes("ALL")
  );

  return {
    user,
    scopes: req.authz?.scopes || (isSuperAdmin ? ["ALL"] : (role === "BRANCH_MANAGER" || role === "MANAGER" ? ["BRANCH"] : [])),
    authorizedBranchIds: req.authz?.authorizedBranches || req.authz?.authorizedBranchIds || userBranchIds,
    isSuperAdmin,
  };
}

function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== "string" && typeof dateStr !== "number") return false;
  const str = String(dateStr).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function validateDateFilters(query) {
  const { dateType, startDate, endDate } = query;

  if (dateType !== undefined && dateType !== null && dateType !== "") {
    const dt = String(dateType).trim().toLowerCase();
    const allowed = ["today", "last3days", "last7days", "mtd", "lastmonth", "custom"];
    if (!allowed.includes(dt)) {
      throw ApiError.badRequest(`Invalid dateType '${dateType}'. Allowed values: today, last7days, mtd, lastmonth, custom.`);
    }
  }

  if (startDate && !endDate) {
    throw ApiError.badRequest("Both 'startDate' and 'endDate' are required for custom date range.");
  }
  if (!startDate && endDate) {
    throw ApiError.badRequest("Both 'startDate' and 'endDate' are required for custom date range.");
  }

  if (startDate && !isValidCalendarDate(startDate)) {
    throw ApiError.badRequest("Invalid date format for 'startDate'. Expected valid YYYY-MM-DD.");
  }
  if (endDate && !isValidCalendarDate(endDate)) {
    throw ApiError.badRequest("Invalid date format for 'endDate'. Expected valid YYYY-MM-DD.");
  }

  if (startDate && endDate && String(startDate).trim() > String(endDate).trim()) {
    throw ApiError.badRequest("Start date cannot be later than end date.");
  }
}

function validatePagination(query) {
  let page = query.page;
  let limit = query.limit;

  if (page !== undefined && page !== null && page !== "") {
    const numPage = Number(page);
    if (!Number.isInteger(numPage) || numPage < 1) {
      throw ApiError.badRequest("Invalid 'page'. Must be a positive integer >= 1.");
    }
    page = numPage;
  } else {
    page = 1;
  }

  if (limit !== undefined && limit !== null && limit !== "") {
    const numLimit = Number(limit);
    if (!Number.isInteger(numLimit) || numLimit < 1 || numLimit > 100) {
      throw ApiError.badRequest("Invalid 'limit'. Must be an integer between 1 and 100.");
    }
    limit = numLimit;
  } else {
    limit = 50;
  }

  return { page, limit };
}

/**
 * GET /api/dashboards/me
 */
const getAvailableDashboards = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const result = await dashboardService.getAvailableDashboards(authContext);
  return ResponseHelper.success(res, result, "Available dashboards retrieved successfully");
});

/**
 * GET /api/dashboards/admin
 * Query params: dataType (revenue, stocks, employees, designers, all), branchId, dateType, startDate, endDate, page, limit
 */
const getAdminDashboard = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  if (!authContext.isSuperAdmin && !(authContext.scopes || []).includes("ALL")) {
    throw ApiError.forbidden("Access denied: Admin dashboard requires company-wide administrative privileges.");
  }

  validateDateFilters(req.query);
  const { page, limit } = validatePagination(req.query);
  const { dateType, startDate, endDate, branchId, dataType = "all" } = req.query;

  const validDataTypes = ["overview", "revenue", "stocks", "employees", "designers", "production", "job orders", "joborders", "all"];
  const normalizedDataType = String(dataType).toLowerCase();
  if (dataType && !validDataTypes.includes(normalizedDataType)) {
    throw ApiError.badRequest(`Invalid dataType '${dataType}'. Allowed values: ${validDataTypes.join(", ")}`);
  }

  if (branchId !== undefined && branchId !== null && branchId !== "" && String(branchId).toUpperCase() !== "ALL") {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw ApiError.badRequest("Invalid 'branchId'. Must be a valid 24-character hexadecimal ObjectId.");
    }
  }

  const adminParams = {
    dataType: normalizedDataType,
    dateType,
    startDate,
    endDate,
    page,
    limit,
    branchId: branchId ? String(branchId).trim() : undefined,
  };
  const result = await cachedDashboard("admin", req, authContext, adminParams, () =>
    dashboardService.getAdminDashboard(adminParams, authContext)
  );

  return ResponseHelper.success(res, result, "Admin dashboard retrieved successfully");
});

/**
 * GET /api/dashboards/manager
 * Query params: dataType (overview, revenue, stocks, employees, designers, production, job orders, all), dateType, startDate, endDate, page, limit
 */
const getManagerDashboard = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  validateDateFilters(req.query);
  const { page, limit } = validatePagination(req.query);
  const { dateType, startDate, endDate, branchId, dataType = "overview" } = req.query;

  const validDataTypes = ["overview", "revenue", "stocks", "employees", "designers", "production", "job orders", "joborders", "all"];
  const normalizedDataType = String(dataType).toLowerCase();
  if (dataType && !validDataTypes.includes(normalizedDataType)) {
    throw ApiError.badRequest(`Invalid dataType '${dataType}'. Allowed values: ${validDataTypes.join(", ")}`);
  }

  const managerParams = {
    dataType: String(dataType).toLowerCase(),
    dateType,
    startDate,
    endDate,
    page,
    limit,
    branchId: branchId ? String(branchId).trim() : undefined,
  };
  const result = await cachedDashboard("manager", req, authContext, managerParams, () =>
    dashboardService.getManagerDashboard(managerParams, authContext)
  );

  return ResponseHelper.success(res, result, "Branch manager dashboard retrieved successfully");
});

/**
 * GET /api/dashboards/designer
 * Query params: dateType, startDate, endDate, page, limit
 */
const getDesignerDashboard = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  validateDateFilters(req.query);
  const { page, limit } = validatePagination(req.query);
  const { dateType, startDate, endDate } = req.query;

  const result = await dashboardService.getDesignerDashboard(
    {
      dateType,
      startDate,
      endDate,
      page,
      limit,
    },
    authContext
  );

  return ResponseHelper.success(res, result, "Designer dashboard retrieved successfully");
});

module.exports = {
  getAvailableDashboards,
  getAdminDashboard,
  getManagerDashboard,
  getDesignerDashboard,
  validateDateFilters,
  validatePagination,
};
