const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate } = require("../../../middleware/auth.middleware");
const { requirePermission } = require("../../../middleware/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");

router.use(authenticate);

// Discover available dashboards for authenticated caller
router.get("/me", dashboardController.getAvailableDashboards);

// Admin Dashboard: company-wide view (ALL scope or Admin)
router.get(
  "/admin",
  requirePermission(PERMISSIONS.DASHBOARDS.ADMIN_VIEW),
  dashboardController.getAdminDashboard
);

// Branch Manager Dashboard: branch-scoped view (BRANCH scope or Manager)
router.get(
  "/manager",
  requirePermission(PERMISSIONS.DASHBOARDS.MANAGER_VIEW, { branchField: "branchId" }),
  dashboardController.getManagerDashboard
);

// Designer Dashboard: personal workload & performance view (ASSIGNED/SELF scope or Designer)
router.get(
  "/designer",
  requirePermission(PERMISSIONS.DASHBOARDS.DESIGNER_VIEW),
  dashboardController.getDesignerDashboard
);

module.exports = router;
