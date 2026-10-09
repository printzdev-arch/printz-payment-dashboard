const express = require("express");
const router = express.Router();
const auditLogController = require("../../controllers/common/auditLog.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

router.use(authenticate);

// List logins / logouts
router.get(
  "/logins",
  requirePermission(PERMISSIONS.COMMON.AUDIT_LOG_VIEW, { branchField: "branchId" }),
  auditLogController.getLoginAuditLogs
);

// Summary aggregate statistics
router.get(
  "/summary",
  requirePermission(PERMISSIONS.COMMON.AUDIT_LOG_VIEW, { branchField: "branchId" }),
  auditLogController.getSummary
);

// Entity-specific audit log history
router.get(
  "/entity/:entityType/:entityId",
  requirePermission(PERMISSIONS.COMMON.AUDIT_LOG_VIEW, { branchField: "branchId" }),
  auditLogController.getEntityAuditLogs
);

// Employee activity audit trail
router.get(
  "/employee-activity/:employeeId",
  requirePermission(PERMISSIONS.COMMON.AUDIT_LOG_VIEW, { branchField: "branchId" }),
  auditLogController.getEmployeeActivity
);

// Get single audit log by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.COMMON.AUDIT_LOG_VIEW, { branchField: "branchId" }),
  auditLogController.getAuditLogById
);

// List audit logs with pagination and filters
router.get(
  "/",
  requirePermission(PERMISSIONS.COMMON.AUDIT_LOG_VIEW, { branchField: "branchId" }),
  auditLogController.getAuditLogs
);

module.exports = router;
