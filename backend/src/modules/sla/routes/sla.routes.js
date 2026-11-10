const express = require("express");
const router = express.Router();
const slaController = require("../controllers/sla.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");

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
