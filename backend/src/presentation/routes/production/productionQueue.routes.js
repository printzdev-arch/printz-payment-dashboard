const express = require("express");
const router = express.Router();
const productionQueueController = require("../../controllers/production/productionQueue.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");

router.use(authenticate);

// Production Queue direct endpoints
router.get(
  "/",
  authorizePermission("production", "read"),
  productionQueueController.getQueue
);

router.get(
  "/counts",
  authorizePermission("production", "read"),
  productionQueueController.getQueueCounts
);

module.exports = router;
