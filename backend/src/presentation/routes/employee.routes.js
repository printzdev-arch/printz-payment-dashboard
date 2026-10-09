const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");
const PERMISSIONS = require("../../shared/constants/permissions");

router.use(authenticate);

// ── List (BRANCH or ALL scope) ──────────────────────────────────────────────
router.get(
  "/",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_VIEW, {
    branchField: "branchId",
    selfField: "_id",
  }),
  employeeController.getEmployees
);

// ── Get by ID (scope-checked in controller/repository) ─────────────────────
router.get(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_VIEW, {
    branchField: "branchId",
    selfField: "_id",
  }),
  employeeController.getEmployeeById
);

// ── Create / Onboard (BRANCH scope — manager must own the target branch) ────
router.post(
  "/",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_CREATE, {
    branchField: "branchId",
  }),
  employeeController.createEmployee
);

// ── Update / Branch Transfer (BRANCH scope) ──────────────────────────────────
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_UPDATE, {
    branchField: "branchId",
  }),
  employeeController.updateEmployee
);

// ── Deactivate / Offboard (ALL scope — admin role) ─────────────────────────
router.post(
  "/:id/deactivate",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_DEACTIVATE, {
    branchField: "branchId",
  }),
  employeeController.deactivateEmployee
);

module.exports = router;
