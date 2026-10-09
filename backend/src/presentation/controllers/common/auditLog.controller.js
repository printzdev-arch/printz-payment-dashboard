const auditLogService = require("../../../application/services/common/auditLog.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");

function extractAuthContext(req) {
  return {
    user: req.user,
    scopes: req.authz?.scopes || [],
    authorizedBranchIds: req.authz?.authorizedBranches || req.authorizedBranchIds || [],
    isSuperAdmin: req.authz?.isSuperAdmin || req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN",
  };
}

const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, entityType, actorId, branchId, startDate, endDate } = req.query;

  const filters = {};
  if (action) filters.action = String(action).trim();
  if (entityType) filters.entityType = String(entityType).trim();
  if (actorId) filters.actorId = String(actorId).trim();
  if (branchId) filters.branchId = String(branchId).trim();

  if (startDate || endDate) {
    filters.timestamp = {};
    if (startDate) filters.timestamp.$gte = new Date(startDate);
    if (endDate) filters.timestamp.$lte = new Date(endDate);
  }

  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await auditLogService.getAuditLogs(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Audit logs retrieved successfully");
});

const getAuditLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);

  const log = await auditLogService.getAuditLogById(id, authContext);
  return ResponseHelper.success(res, log, "Audit log retrieved successfully");
});

const getEntityAuditLogs = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const authContext = extractAuthContext(req);

  const result = await auditLogService.getEntityAuditLogs(
    entityType,
    entityId,
    { page: Number(page), limit: Number(limit) },
    authContext
  );
  return ResponseHelper.success(res, result, `Audit logs for entity '${entityType}' retrieved successfully`);
});

const getLoginAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, actorId, branchId } = req.query;
  const filters = {};
  if (actorId) filters.actorId = String(actorId).trim();
  if (branchId) filters.branchId = String(branchId).trim();

  const authContext = extractAuthContext(req);
  const result = await auditLogService.getLoginAuditLogs(
    filters,
    { page: Number(page), limit: Number(limit) },
    authContext
  );
  return ResponseHelper.success(res, result, "Login audit logs retrieved successfully");
});

const getEmployeeActivity = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const authContext = extractAuthContext(req);

  const result = await auditLogService.getEmployeeActivity(
    employeeId,
    { page: Number(page), limit: Number(limit) },
    authContext
  );
  return ResponseHelper.success(res, result, `Activity logs for employee '${employeeId}' retrieved successfully`);
});

const getSummary = asyncHandler(async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  const filters = {};
  if (branchId) filters.branchId = String(branchId).trim();
  if (startDate || endDate) {
    filters.timestamp = {};
    if (startDate) filters.timestamp.$gte = new Date(startDate);
    if (endDate) filters.timestamp.$lte = new Date(endDate);
  }

  const authContext = extractAuthContext(req);
  const summary = await auditLogService.getSummary(filters, authContext);
  return ResponseHelper.success(res, summary, "Audit log summary retrieved successfully");
});

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getEntityAuditLogs,
  getLoginAuditLogs,
  getEmployeeActivity,
  getSummary,
};
