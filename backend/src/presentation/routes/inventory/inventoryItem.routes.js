const express = require("express");
const router = express.Router();
const inventoryItemController = require("../../controllers/inventory/inventoryItem.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

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
  inventoryItemController.createInventoryItem
);

// Update item (itemCode is immutable)
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY.ITEM_MANAGE),
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
