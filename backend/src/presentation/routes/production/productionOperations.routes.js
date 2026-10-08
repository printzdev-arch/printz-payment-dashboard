const express = require("express");
const router = express.Router();
const productionOperationController = require("../../controllers/production/productionOperation.controller");
const productionQueueController = require("../../controllers/production/productionQueue.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const {
  assignOperationValidator,
  startOperationValidator,
  completeOperationValidator,
  idParamValidator,
} = require("../../validators/production/production.validator");

router.use(authenticate);

// Queue endpoints
router.get(
  "/queue",
  authorizePermission("production", "read"),
  productionQueueController.getQueue
);

router.get(
  "/queue/counts",
  authorizePermission("production", "read"),
  productionQueueController.getQueueCounts
);

// Operation Actions
router.post(
  "/:id/assign",
  assignOperationValidator,
  authorizePermission("production", "update"),
  productionOperationController.assignOperation
);

router.post(
  "/:id/claim",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  productionOperationController.claimOperation
);

router.post(
  "/:id/start",
  startOperationValidator,
  authorizePermission("production", "update"),
  productionOperationController.startOperation
);

router.post(
  "/:id/complete",
  completeOperationValidator,
  authorizePermission("production", "update"),
  productionOperationController.completeOperation
);

router.post(
  "/:id/fail",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  productionOperationController.failOperation
);

router.post(
  "/:id/retry",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  productionOperationController.retryOperation
);

router.post(
  "/:id/skip",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  productionOperationController.skipOperation
);

module.exports = router;
