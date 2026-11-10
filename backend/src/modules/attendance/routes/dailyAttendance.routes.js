const express = require("express");
const router = express.Router();
const dailyAttendanceController = require("../controllers/dailyAttendance.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const { authorizeRoles } = require("../../../middleware/security/role.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");
const {
  attendanceIdParamValidator,
  getAttendanceQueryValidator,
  dateAndBranchQueryValidator,
  createAttendanceValidator,
  updateAttendanceValidator,
  reconcileValidator,
  checkInValidator,
  checkOutValidator,
  batchPunchValidator,
  finalizeAttendanceValidator,
  reopenAttendanceValidator,
} = require("./dailyAttendance.validator");

const attendancePermissionRoutes = require("./attendancePermission.routes");

router.use(authenticate);

// ── Sub-router: /api/attendance/permissions ─────────────────────────────────
router.use("/permissions", attendancePermissionRoutes);

// ── GET /api/attendance/summary (Monthly / Date-range Attendance Summary) ────
router.get(
  "/summary",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  dateAndBranchQueryValidator,
  dailyAttendanceController.getAttendanceSummary
);

// ── GET /api/attendance/employees-for-date ──────────────────────────────────
router.get(
  "/employees-for-date",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  dateAndBranchQueryValidator,
  dailyAttendanceController.getEmployeesForDate
);

// ── GET /api/attendance/missing ─────────────────────────────────────────────
router.get(
  "/missing",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  dateAndBranchQueryValidator,
  dailyAttendanceController.getMissingAttendance
);

// ── POST /api/attendance/check-in (Branch Manager Punch In) ─────────────────
router.post(
  "/check-in",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  checkInValidator,
  dailyAttendanceController.recordCheckIn
);

// ── POST /api/attendance/check-out (Branch Manager Punch Out) ───────────────
router.post(
  "/check-out",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  checkOutValidator,
  dailyAttendanceController.recordCheckOut
);

// ── POST /api/attendance/batch-punch (Branch Manager Batch Punch) ───────────
router.post(
  "/batch-punch",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  batchPunchValidator,
  dailyAttendanceController.batchPunch
);

// ── POST /api/attendance/reconcile (Admin / HR Admin Reconcile) ─────────────
router.post(
  "/reconcile",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  authorizeRoles("ADMIN", "HR_ADMIN", "SUPER_ADMIN"),
  reconcileValidator,
  dailyAttendanceController.reconcileAttendance
);

// ── POST /api/attendance/finalize (Admin / HR Admin Finalize & Lock) ────────
router.post(
  "/finalize",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  authorizeRoles("ADMIN", "HR_ADMIN", "SUPER_ADMIN"),
  finalizeAttendanceValidator,
  dailyAttendanceController.finalizeAttendance
);

// ── POST /api/attendance/reopen (Super Admin Reopen Period) ─────────────────
router.post(
  "/reopen",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  authorizeRoles("SUPER_ADMIN"),
  reopenAttendanceValidator,
  dailyAttendanceController.reopenAttendance
);

// ── POST /api/attendance/generate-holidays (Admin Controlled Generation) ────
router.post(
  "/generate-holidays",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  authorizeRoles("ADMIN", "HR_ADMIN", "SUPER_ADMIN"),
  dailyAttendanceController.generateHolidayAttendanceRecords
);

// ── GET /api/attendance (List Attendance Records with Filters & Pagination) ─
router.get(
  "/",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  getAttendanceQueryValidator,
  dailyAttendanceController.getAttendance
);

// ── POST /api/attendance (Administrative Manual Create) ─────────────────────
router.post(
  "/",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  authorizeRoles("ADMIN", "HR_ADMIN", "SUPER_ADMIN"),
  createAttendanceValidator,
  dailyAttendanceController.createAttendance
);

// ── GET /api/attendance/:id (Get Attendance Record by ID) ───────────────────
router.get(
  "/:id",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_VIEW, { branchField: "branchId" }),
  attendanceIdParamValidator,
  dailyAttendanceController.getAttendanceById
);

// ── PUT /api/attendance/:id (Update Daily Attendance Record) ────────────────
router.put(
  "/:id",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  authorizeRoles("ADMIN", "HR_ADMIN", "SUPER_ADMIN"),
  updateAttendanceValidator,
  dailyAttendanceController.updateAttendance
);

// ── DELETE /api/attendance/:id (Delete Daily Attendance Record) ─────────────
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.HR.ATTENDANCE_MANAGE, { branchField: "branchId" }),
  authorizeRoles("ADMIN", "HR_ADMIN", "SUPER_ADMIN"),
  attendanceIdParamValidator,
  dailyAttendanceController.deleteAttendance
);

module.exports = router;
