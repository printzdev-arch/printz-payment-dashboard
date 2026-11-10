const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");
const { employeeShiftRoutes } = require("../../employee-shift/routes");

router.use(authenticate);

// Temporary branch shifting (/shifts, /:id/shifts). Must be mounted before "/:id".
router.use(employeeShiftRoutes);

// ── List (BRANCH or ALL scope) ──────────────────────────────────────────────
router.get(
  "/",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_VIEW, {
    branchField: "branchId",
    selfField: "_id",
  }),
  employeeController.getEmployees
);

// ── Roles an employee can be given. Must be registered before "/:id". ───────
router.get(
  "/roles",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_VIEW, {
    branchField: "branchId",
    selfField: "_id",
  }),
  employeeController.getRoleOptions
);

router.get(
  "/page-catalog",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_VIEW, {
    branchField: "branchId",
    selfField: "_id",
  }),
  employeeController.getPageCatalog
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

// ── Reset the password of the employee's login ───────────────────────────────
router.post(
  "/:id/password",
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_UPDATE, {
    branchField: "branchId",
  }),
  employeeController.resetLoginPassword
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
