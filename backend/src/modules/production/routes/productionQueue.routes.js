const express = require("express");
const router = express.Router();
const productionQueueController = require("../controllers/productionQueue.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");

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
