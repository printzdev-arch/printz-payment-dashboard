const express = require("express");
const router = express.Router();
const slaController = require("../../controllers/sla/sla.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");

// All routes require authentication
router.use(authenticate);

router.get(
  "/summary",
  authorizePermission("sla", "read"),
  slaController.getSlaSummary
);

router.get(
  "/at-risk",
  authorizePermission("sla", "read"),
  slaController.getAtRiskSla
);

module.exports = router;
