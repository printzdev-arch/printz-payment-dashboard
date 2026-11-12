const express = require("express");
const router = express.Router();
const inventoryItemController = require("../controllers/inventoryItem.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");
const { createInventoryItemValidator, updateInventoryItemValidator } = require("./validators");

router.use(authenticate);

// Get list of inventory items
router.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY.ITEM_VIEW),
  inventoryItemController.getInventoryItems
);

// Get item by ID (with branch-scoped balances)
router.get(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY.ITEM_VIEW),
  inventoryItemController.getInventoryItemById
);

// Create item
router.post(
  "/",
  requirePermission(PERMISSIONS.INVENTORY.ITEM_MANAGE),
  createInventoryItemValidator,
  inventoryItemController.createInventoryItem
);

// Update item (itemCode is immutable)
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY.ITEM_MANAGE),
  updateInventoryItemValidator,
  inventoryItemController.updateInventoryItem
);

// Deactivate item
router.post(
  "/:id/deactivate",
  requirePermission(PERMISSIONS.INVENTORY.ITEM_MANAGE),
  inventoryItemController.deactivateInventoryItem
);

// Activate item
router.post(
  "/:id/activate",
  requirePermission(PERMISSIONS.INVENTORY.ITEM_MANAGE),
  inventoryItemController.activateInventoryItem
);

module.exports = router;
