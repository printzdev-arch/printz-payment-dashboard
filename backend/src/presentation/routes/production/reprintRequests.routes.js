const express = require("express");
const router = express.Router();
const reprintRequestController = require("../../controllers/production/reprintRequest.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const { idParamValidator } = require("../../validators/production/production.validator");

router.use(authenticate);

// Reprint Requests endpoints
router.get(
  "/",
  authorizePermission("production", "read"),
  reprintRequestController.getReprintRequests
);

router.get(
  "/:id",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  reprintRequestController.getReprintRequestById
);

router.post(
  "/:id/approve",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  reprintRequestController.approveReprintRequest
);

router.post(
  "/:id/reject",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  reprintRequestController.rejectReprintRequest
);

module.exports = router;
