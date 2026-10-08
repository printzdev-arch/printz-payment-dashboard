const express = require("express");
const router = express.Router();
const qualityCheckController = require("../../controllers/production/qualityCheck.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const { idParamValidator } = require("../../validators/production/production.validator");

router.use(authenticate);

// Quality Checks endpoints
router.get(
  "/pending",
  authorizePermission("production", "read"),
  qualityCheckController.getPendingQualityChecks
);

router.get(
  "/",
  authorizePermission("production", "read"),
  qualityCheckController.getQualityChecks
);

router.get(
  "/:id",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  qualityCheckController.getQualityCheckById
);

router.get(
  "/:id/report",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  qualityCheckController.getQualityCheckReport
);

module.exports = router;
