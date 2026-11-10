const express = require("express");
const router = express.Router();
const qualityCheckController = require("../controllers/qualityCheck.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");
const { idParamValidator } = require("./production.validator");

router.use(authenticate);

// Quality Checks endpoints
router.get(
  "/pending",
  authorizePermission("production", "read"),
  qualityCheckController.getPendingQualityChecks
);

router.get(
  "/queue",
  authorizePermission("production", "read"),
  qualityCheckController.getPendingQualityChecks
);

router.post(
  "/",
  authorizePermission("production", "create"),
  qualityCheckController.createQualityCheckDirect
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
