const express = require("express");
const router = express.Router();
const numberSequenceController = require("../../controllers/common/numberSequence.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

router.use(authenticate);

// Admin read-only number sequence listing
router.get(
  "/",
  requirePermission(PERMISSIONS.ADMIN.ROLE_VIEW),
  numberSequenceController.getNumberSequences
);

module.exports = router;
