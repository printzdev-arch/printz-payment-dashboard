const express = require("express");
const router = express.Router();
const numberSequenceController = require("../controllers/numberSequence.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");

router.use(authenticate);

// Admin read-only number sequence listing
router.get(
  "/",
  requirePermission(PERMISSIONS.ADMIN.ROLE_VIEW),
  numberSequenceController.getNumberSequences
);

module.exports = router;
