const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");
const ApiError = require("../../../utils/errors/ApiError");
const { employeeShiftRoutes } = require("../../employee-shift/routes");
const { createEmployeeValidator, updateEmployeeValidator, resetPasswordValidator } = require("./employee.validator");

router.use(authenticate);

// Branch managers can see employees (attendance, salary and other screens need the list) but cannot add,
// change, deactivate or reset the login of one. That is done by an admin.
const MANAGER_ROLES = ["manager", "branch_manager", "branch_manager1"];
const blockManagers = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  const code = String(req.user?.roleCode || "").toLowerCase();
  if (MANAGER_ROLES.includes(role) || MANAGER_ROLES.includes(code)) {
    return next(ApiError.forbidden("Branch managers cannot add or change employees. Please ask an admin."));
  }
  return next();
};

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
  blockManagers,
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_CREATE, {
    branchField: "branchId",
  }),
  createEmployeeValidator,
  employeeController.createEmployee
);

// ── Update / Branch Transfer (BRANCH scope) ──────────────────────────────────
router.patch(
  "/:id",
  blockManagers,
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_UPDATE, {
    branchField: "branchId",
  }),
  updateEmployeeValidator,
  employeeController.updateEmployee
);

// ── Reset the password of the employee's login ───────────────────────────────
router.post(
  "/:id/password",
  blockManagers,
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_UPDATE, {
    branchField: "branchId",
  }),
  resetPasswordValidator,
  employeeController.resetLoginPassword
);

// ── Deactivate / Offboard (ALL scope — admin role) ─────────────────────────
router.post(
  "/:id/deactivate",
  blockManagers,
  requirePermission(PERMISSIONS.ADMIN.EMPLOYEE_DEACTIVATE, {
    branchField: "branchId",
  }),
  employeeController.deactivateEmployee
);

module.exports = router;
