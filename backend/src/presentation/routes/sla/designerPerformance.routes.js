const express = require("express");
const router = express.Router();
const designerPerformanceController = require("../../controllers/sla/designerPerformance.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const { performanceTrendValidator } = require("../../validators/sla/sla.validator");

// All routes require authentication
router.use(authenticate);

router.get(
  "/performance",
  authorizePermission("design", "read"),
  designerPerformanceController.getPerformance
);

router.get(
  "/:employeeId/performance/trend",
  performanceTrendValidator,
  authorizePermission("design", "read"),
  designerPerformanceController.getPerformanceTrend
);

module.exports = router;
