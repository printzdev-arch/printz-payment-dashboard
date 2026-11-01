const express = require("express");
const router = express.Router();
const attendancePermissionController = require("../controllers/attendancePermission.controller");
const { authenticate } = require("../../../middleware/auth.middleware");
const { requirePermission } = require("../../../middleware/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");
const {
  permissionIdParamValidator,
  getPermissionsQueryValidator,
  createPermissionValidator,
  updatePermissionValidator,
} = require("../validators/attendancePermission.validator");

router.use(authenticate);

// ── GET /api/v1/attendance/permissions/balance/:employeeId ───────────────────
router.get(
  "/balance/:employeeId",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  attendancePermissionController.getEmployeeBalance
);

// ── GET /api/v1/attendance/permissions/balance (Employee Balance) ───────────
router.get(
  "/balance",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  attendancePermissionController.getEmployeeBalance
);

// ── POST /api/v1/attendance/permissions (Record Permission - Automatically Granted) ─
router.post(
  "/",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  createPermissionValidator,
  attendancePermissionController.createPermission
);

// ── GET /api/v1/attendance/permissions (List Permission Records) ────────────
router.get(
  "/",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  getPermissionsQueryValidator,
  attendancePermissionController.getPermissions
);

// ── GET /api/v1/attendance/permissions/:id (Get Record by ID) ───────────────
router.get(
  "/:id",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  permissionIdParamValidator,
  attendancePermissionController.getPermissionById
);

// ── PUT /api/v1/attendance/permissions/:id (Update Permission & Recalculate Allowance) ──
router.put(
  "/:id",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  updatePermissionValidator,
  attendancePermissionController.updatePermission
);

// ── DELETE /api/v1/attendance/permissions/:id (Delete / Cancel & Restore Allowance) ────
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  permissionIdParamValidator,
  attendancePermissionController.deletePermission
);

module.exports = router;
