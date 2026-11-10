const express = require("express");
const router = express.Router();
const employeeShiftController = require("../controllers/employeeShift.controller");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");

// Temporary Branch Shifting (Admin only).
// Mounted inside employee.routes.js BEFORE "/:id" so "/shifts" is not read as an employee id.
// Authentication is applied by the parent employee router.

router.get(
  "/shifts",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_VIEW),
  employeeShiftController.getBranchShifts
);

router.post(
  "/shifts/:shiftId/cancel",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_UPDATE),
  employeeShiftController.cancelBranchShift
);

router.post(
  "/shifts/:shiftId/end-early",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_UPDATE),
  employeeShiftController.endBranchShiftEarly
);

router.get(
  "/:id/shifts",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_VIEW),
  employeeShiftController.getBranchShifts
);

router.post(
  "/:id/shifts",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_UPDATE),
  employeeShiftController.createBranchShift
);

module.exports = router;
